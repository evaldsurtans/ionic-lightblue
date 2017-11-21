import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { BLE } from "@ionic-native/ble";
import {Observable} from 'rxjs/Observable';

declare function require(name:string): any;
declare const Buffer: any;

const yaml = require('js-yaml');

const st = require('./js/services/serial-transport')
const commands = require('./js/command-definitions')
const util = require('./js/util/util')

const UUID_SERVICE_SERIAL_TRANSPORT = 'a495ff10-c5b1-4b44-b512-1370f02d74de';
const UUID_CHAR_SERIAL_TRANSPORT =    'a495ff11-c5b1-4b44-b512-1370f02d74de';

const MESSAGE_RESPONSE_BIT   = 0x80;
const LB_MAX_PACKET_LENGTH = 19

@Injectable()
export class LightBlueService {

	_commandDefs = <any>{};
	_deviceId = '';

	_isWaitingResponse = false;
	_timerWaitingResponse = 0;
	_endResponseSymbol = "\n";

	_packetCount = 0
	_outgoingPackets = <any>[]
	_incomingPackets = <any>[];

	_incommingObserver = <any>{};
	_incomingString = '';

	_timeoutConnection = 0;

	constructor(private http: Http, private ble: BLE)
	{

	}

	_definitionForCommand(cmdId:any): any {
		if (this._commandDefs.incoming[cmdId])
			return this._commandDefs.incoming[cmdId]

		if (this._commandDefs.outgoing[cmdId])
			return this._commandDefs.outgoing[cmdId]

		throw new Error(`No definition for command ID: ${cmdId}`)
	}

	connect(name: string, timeout:Number = 0, endResponseSymbol:string = "\n") : Observable<any> {
		this._endResponseSymbol = endResponseSymbol;
		this._isWaitingResponse = false;
		this._incomingString = '';

		//console.log('lbe: connect');

		return new Observable<any>(observer => {
			if (this.ble.isEnabled()) {
				this.http.get('assets/command-definitions.yaml').subscribe(data => {
					try {
						this._commandDefs = yaml.safeLoad(data.text());

						if(timeout > 0) {
							this._timeoutConnection = setTimeout(() => {
								this.ble.stopScan().then(() => {
									observer.error("Connection timeout reached");
									observer.complete();
								});
							}, timeout);
						}

						//console.log('lbe: startScanWithOptions');
						this.ble.startScanWithOptions([], {reportDuplicates: false}).subscribe((device: any) => {
							//alert(device.name);
							//console.log('lbe: device: ' + device.name);

							if(device.name == name)
							{
								if(timeout > 0) {
									clearTimeout(this._timeoutConnection);
								}
								this.ble.stopScan().then(() => {
									this._deviceId = device.id;
									this.ble.isConnected(this._deviceId).then(() => {
										//console.log('lbe: isConnected');
										observer.complete();
									}).catch(() => {
										//console.log('lbe: connect');
										this.ble.connect(this._deviceId).subscribe((peripheralData: any) => {
											//console.log('lbe: connect true');
											observer.next(peripheralData);
											//observer.next(this._commandDefs);
											observer.complete();
										});
									});
								});
							}
						});
					}
					catch (exc) {
						observer.error(exc);
						observer.complete();
					}
				},
				error => {
					observer.error(error);
					observer.complete();
				});
			}
			else {
				observer.error("BLE is not enabled");
				observer.complete();
			}
		});
	}

	disconnect() : Observable<any> {
		return new Observable<any>(observer => {
			this.ble.disconnect(this._deviceId).then(() => {
				observer.next(true);
				observer.complete();
			}).catch(error => {
				observer.error(error);
				observer.complete();
			});
		});
	}

	sendSerial(message:string, isWaitResponse:boolean = false, timeoutMilisec:number = 0) : Observable<any> {
		return new Observable<any>(observer => {
			try {
				if(isWaitResponse) {
					if (this._isWaitingResponse) {
						observer.error("waiting response from previous send request");
						observer.complete();
						return;
					}
					this._isWaitingResponse = true;
					this._incommingObserver = observer;
					if(timeoutMilisec != 0) {
						this._timerWaitingResponse = setTimeout(() => {
							this._isWaitingResponse = false;
							this._incommingObserver.error("Timeout");
							this._incomingString = '';
							this._incommingObserver.complete();
						}, timeoutMilisec);
					}
				}
				else {
					this._isWaitingResponse = false;
				}

				let commandId = commands.commandIds.SERIAL_DATA;

				// Pack the binary command
				let defn = this._definitionForCommand(commandId);
				let command = new commands.Command(commandId, [ Buffer.from(message) ], defn);
				let commandPayload = command.pack();

				// Split the command into 1 or more LightBlue packets and queue them
				let numPackets = Math.ceil(commandPayload.length / LB_MAX_PACKET_LENGTH);
				this._packetCount = (this._packetCount + 1) % 4;

				for (let i = 0; i < numPackets; i++) {
					let offset = i * LB_MAX_PACKET_LENGTH;
					let packetPayload = commandPayload.slice(offset, offset + LB_MAX_PACKET_LENGTH);

					let first = false;
					if (i == 0)
						first = true;


					let packet = new st.LightBluePacket(first, this._packetCount, numPackets - (i + 1), packetPayload);
					this._outgoingPackets.push(packet);

					packet = this._outgoingPackets.shift();
					let packetData = packet.pack();

					var arrayBuffer = packetData.buffer;
					this.ble.write(this._deviceId, UUID_SERVICE_SERIAL_TRANSPORT, UUID_CHAR_SERIAL_TRANSPORT, arrayBuffer).then(value => {
						//Message transmitted
						if(!isWaitResponse) {
							observer.next(value);
							observer.complete();
						}
					}).catch(error => {
						observer.error("ble.write: " + error.toString());
						observer.complete();
					});
				}


			}
			catch(exc)
			{
				this._isWaitingResponse = false;
				observer.error("sendSerial: " + exc.toString());
				observer.complete();
			}
 		});
	}

	readSerial() : Observable<any> {
		return new Observable<any>(observer => {
			this.ble.startNotification(this._deviceId, UUID_SERVICE_SERIAL_TRANSPORT, UUID_CHAR_SERIAL_TRANSPORT).subscribe(
				buffer => {
					try {
						var value = Buffer.from(buffer);

						var packet = st.LightBluePacket.fromBuffer(value);
						this._incomingPackets.push(packet);

						if (packet.finalPacket()) {
							let packetPayloads = <any>[]
							for (let p of this._incomingPackets) {
								packetPayloads.push(p.getPayload());
							}
							this._incomingPackets = <any>[];

							//observer.next("packets received");

							let commandPayload = util.concatBuffers(packetPayloads);

							let incomingMessageId = commandPayload.readUInt16BE(2) & ~MESSAGE_RESPONSE_BIT;
							let incomingCommandDefn = this._commandDefs.incoming[incomingMessageId];
							let outgoingCommandDefn = this._commandDefs.outgoing[incomingMessageId];

							if(incomingCommandDefn) {
								let command = commands.Command.fromBuffer(commandPayload, incomingCommandDefn);
								let args = command.asObject(command.getDefinition().arguments);

								let msgValue = args.data.toString();
								if(this._isWaitingResponse)
								{
									this._incomingString += msgValue;
									if(msgValue.endsWith(this._endResponseSymbol))
									{
										this._incommingObserver.next(this._incomingString);
										this._incomingString = '';
										this._isWaitingResponse = false;
										this._incommingObserver.complete();

										if(this._timerWaitingResponse != 0) {
											clearTimeout(this._timerWaitingResponse);
										}
									}
								}
								else {
									observer.next(msgValue);
								}
							}

						}
					}
					catch (exc) {
						observer.error("ble.startNotification: " + exc.toString());
						observer.complete();
					}
				},
				error => {
					observer.error("readSerial: " + error.toString());
					observer.complete();
				}
			)

		});
	}

}

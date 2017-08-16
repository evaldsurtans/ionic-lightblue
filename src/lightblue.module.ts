import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpModule, Http } from '@angular/http';

import { LightBlueService } from './lightblue.service';
import { BLE } from "@ionic-native/ble";

export function serviceFactory(http: Http, ble: BLE) {
	return new LightBlueService(http, ble);
}

@NgModule({
	imports: [CommonModule, HttpModule],
	providers: [
		BLE,
		{ provide: LightBlueService, useFactory: serviceFactory, deps: [Http, BLE] }
	]
	//declarations: [SeedComponent],
	//exports: [SeedComponent]
})
export class LightBlueModule { }

# ionic-lightblue
LightBlue Bean Serial Support for Ionic2

## Prerequisites

Install Ionic2 BLE library + cordova-plugin-ble-central 

https://ionicframework.com/docs/native/ble/

## Usage

app.module.ts

```javascript

import { LightBlueModule } from 'ionic-lightblue';

@NgModule({
  imports: [
    LightBlueModule,
    ]
  ....

```

view.ts

```javascript

import { LightBlueService } from 'ionic-lightblue';

const LIGHTBLUE_NAME = 'BeanName';
const OPTIONAL_END_SERIAL_RESPONSE_CHAR = "\n";

export class View {


  constructor(
              public platform: Platform,
              private lightblue: LightBlueService,
              ) {
   
    platform.ready().then(() => {
      console.log('platform ready');

      // OPTIONAL_END_SERIAL_RESPONSE_CHAR used when sendSerial isWaitResponse = true
      this.lightblue.connect(LIGHTBLUE_NAME, OPTIONAL_END_SERIAL_RESPONSE_CHAR).subscribe(next => {
          console.log("connected");

          this.lightblue.readSerial().subscribe( next => {
              console.log(next);
          },
          error => {
            console.log(error.toString());
          })
      },
      error => {
        console.log(error.toString());
      });
    });
  }

  onSend() {
    console.log("send");
    // Can wait or not wait response
    this.lightblue.sendSerial("command", true).subscribe(next => {
      console.log(next);
    },
    error => {
      console.log(error.toString());
    });
  }

}

```

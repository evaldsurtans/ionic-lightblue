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

export class View {


  constructor(
              public platform: Platform,
              private lightblue: LightBlueService,
              ) {
   
    platform.ready().then(() => {
      console.log('platform ready');

      this.lightblue.connect(LIGHTBLUE_NAME).subscribe(next => {
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
    this.lightblue.sendSerial("tester").subscribe(next => {
      console.log(next);
    },
    error => {
      console.log(error.toString());
    });
  }

}

```

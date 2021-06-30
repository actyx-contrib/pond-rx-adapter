# RX Pond

```typescript
import { RxPond } from '@actyx-contrib/rx-pond'
RxPond.from(myPond).observe(myFish).map(someFunction).subscribe(myCallback)`
```

## Installation

RxPond is available as a [npm package](https://www.npmjs.com/package/@actyx-contrib/rx-pond).

```shell
npm install @actyx-contrib/rx-pond
```

## Overview

This library provides a very simple RXjs adapter for the Pond. The `RxPond` type supplies all the
same functions as the regular `Pond` does, only with the interface return `Observable` where
useful. The most obvious example being the `RxPond.observe` function that returns an `Observable<S>`
rather than taking a callback.

To get ahold of an `RxPond`, there are these options:

```typescript
import { RxPond } from '@actyx-contrib/rx-pond'

// Create an RxPond from an existing Pond instance
const fromExisting = RxPond.from(myPond)

// Create an RxPond backed by a Pond with default parameters
const defaultRxPond = RxPond.default({
      appId: 'com.example.rx-pond-example',
      displayName: 'RX Pond Example',
      version: '0.0.1',
    })

// Provide custom parameters (same arguments as Pond.of)
const parameterizedRxPond = RxPond.of(
    // Configure AppManifest
    {
      appId: 'com.example.rx-pond-example',
      displayName: 'RX Pond Example',
      version: '0.0.1',
      signature: '<signature>'
    }
    // Configure connection options 
    { 
      actyxHost: 'localhost',
      actyxPort: '4243',
      onConnectionLost: () => console.error('connection to Actyx lost')    
    },
    // Configure Pond options
    {
        fishErrorReporter: (err, fishId, detail) > console.error('fish error', err, fishId, detail)
    }
     )
```

## Compatibility

This library is _version agnostic_ in regards to RXjs – it works flawlessly with both 5.x and 6.x.

This library remains compatible with all future releases in the Pond V2 line.

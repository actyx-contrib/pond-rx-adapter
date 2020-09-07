# Pond RX Adapter
`RxPond.from(myPond).observe(myFish).map(someFunction).subscribe(myCallback)`

### Overview

This library provides a very simple RXjs adapter for the Pond. The `RxPond` type supplies all the
same functions as the regular `Pond` does, only with the interface return `Observable` where
useful. The most obvious example being the `RxPond.observe` function that returns an `Observable<S>`
rather than taking a callback.

To get ahold of an `RxPond`, there are these options:
```typescript
// Create an RxPond from an existing Pond instance
const fromExisting = RxPond.from(myPond)

// Create an RxPond backed by a Pond with default parameters
const defaultPondRx = RxPond.default()

// Provide custom parameters (same arguments as Pond.of)
const parameterizedPondRx = RxPond.of({ url: 'ws://localhost:4444' }, {})
```

### Compatibility

This library is _version agnostic_ in regards to RXjs – it should work flawlessly with both 5.x and
6.x.

This library should remain compatible with all future releases in the Pond V2 line.

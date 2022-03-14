/*
 * Copyright 2021 Actyx AG
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  AppManifest,
  CancelSubscription,
  Fish,
  ObserveAllOpts,
  Pond,
  PondInfo,
  PondState,
  SplashState,
  StateEffect,
  Tags,
  Where,
} from '@actyx/pond'
import { Observable } from 'rxjs'
import { mkEvents, RxEventFn } from './events'

export type RxPond = {
  /**
   * Emit a single event directly.
   *
   * @typeParam E  - Type of the event payload. If your tags are statically declared,
   *                 their type will be checked against the payload’s type.
   *
   * @param tags   - Tags to attach to the event. E.g. `Tags('myTag', 'myOtherTag')`
   * @param event  - The event itself.
   * @returns        An Observable that completes when emission is done.
   *                 The Observable is *hot*, i.e. emission will happen even when the Observable is not subscribed to.
   */
  emit<E>(tags: Tags<E>, event: E): Observable<undefined>

  /* AGGREGATION */

  /**
   * Observe the current state of a Fish.
   *
   * Caching is done based on the `fishId` inside the `fish`, i.e. if a fish with the included
   * `fishId` is already known, that other Fish’s ongoing aggregation will be used instead of
   * starting a new one.
   *
   * @param fish       - Complete Fish information.
   * @returns            An Observable of updated states. Each published state will be stricter newer than the last one.
   *                     (One state is buffered and immediately supplied to new subscribers.)
   */
  observe<S, E>(fish: Fish<S, E>): Observable<S>

  /**
   * Create Fish from events and observe them all.
   * Note that if a Fish created from some event f0 will also observe events earlier than f0, if they are selected by `where`
   *
   * @typeParam F        - Type of the events used to initialize Fish.
   * @typeParam S        - Type of the observed Fish’s state.
   *
   * @param seedEventsSelector  - A `Where<F>` object identifying the seed events to start Fish from
   * @param makeFish     - Factory function to create a Fish with state `S` from an event of type `F`.
   *                       If Fish with same FishId are created by makeFish, these Fish must be identical!
   *                       `undefined` may be returned to indicate the given seed event should not be converted to a Fish at all.
   * @param opts         - Optional arguments regarding caching and expiry
   *
   * @returns            An Observable of updated states. At least one published state will be stricter newer than the last one.
   *                     (The last states are buffered and immediately supplied to new subscribers.)
   *
   * @beta
   */
  observeAll<ESeed, S>(
    seedEventsSelector: Where<ESeed>,
    makeFish: (seedEvent: ESeed) => Fish<S, any> | undefined,
    opts: ObserveAllOpts,
  ): Observable<S[]>

  /**
   * Find the event selected by `firstEvent`, and start a Fish from it.
   * It is legal for `firstEvent` to actually select multiple events;
   * however, `makeFish` must yield the same Fish no matter one is passed in.
   *
   * @typeParam F        - Type of the initial event.
   * @typeParam S        - Type of the observed Fish’s state.
   *
   * @param seedEventSelector   - A `Where<F>` object identifying the seed event
   * @param makeFish     - Factory function to create the Fish with state `S` from the event of type `F`.
   *                       The Fish is able to observe events earlier than the first event.
   * @param callback     - Function that will be called with the Fish’s state `S`.
   *                       As long as the first event does not exist, this callback will also not be called.
   *
   * @returns              An Observable of updated states. At least one published state will be stricter newer than the last one.
   *                       As long as the first event does not exist, this callback will also not be called.
   *                       (The last states are buffered and immediately supplied to new subscribers.)
   *
   * @beta
   */
  observeOne<ESeed, S>(
    seedEventSelector: Where<ESeed>,
    makeFish: (seedEvent: ESeed) => Fish<S, any>,
  ): Observable<S>

  /* CONDITIONAL EMISSION (STATE EFFECTS) */

  /**
   * Run a `StateEffect` against currently known local state of Fish. Emit events based on it by
   * calling the `enqueue` function passed into the invocation of your effect. Every subsequent
   * invocation of `run` for the same Fish is guaranteed to see all events previously enqueued by
   * effects on that Fish already applied to the state. (Local serialisation guarantee.)
   *
   * In regards to other nodes or Fishes, there are no serialisation guarantees.
   *
   * @typeParam S              - State of the Fish, input value to the effect.
   * @typeParam EWrite         - Event type(s) the effect may emit.
   *
   * @param fish       - Complete Fish information.
   * @param effect     - Function to enqueue new events based on state.
   * @returns            An Observable that completes when emission is done.
   *                      The Observable is *hot*, i.e. effect will run even when the Observable is not subscribed to.
   */
  run<S, EWrite>(
    fish: Fish<S, any>,
    fn: StateEffect<S, EWrite>,
  ): Observable<undefined>

  /**
   * Install a StateEffect that will be applied automatically whenever the `Fish`’s State has changed.
   * Every application will see the previous one’s resulting Events applied to the State already, if applicable;
   * but any number of intermediate States may have been skipped between two applications.
   *
   * In regards to other nodes or Fishes, there are no serialisation guarantees.
   *
   * The effect can be uninstalled by calling the returned `CancelSubscription`.
   *
   * @typeParam S              - State of the Fish, input value to the effect.
   * @typeParam EWrite         - Event type(s) the effect may emit.
   *
   * @param fish       - Complete Fish information.
   * @param effect     - Function that decides whether to enqueue new events based on the current state.
   * @param autoCancel - Condition on which the automatic effect will be cancelled -- state on which `autoCancel` returns `true`
   *                     will be the first state the effect is *not* applied to anymore. Keep in mind that not all intermediate
   *                     states will be seen by this function.
   * @returns            A `CancelSubscription` object that can be used to cancel the automatic effect.
   */
  keepRunning<S, EWrite>(
    fish: Fish<S, any>,
    fn: StateEffect<S, EWrite>,
    autoCancel?: (state: S) => boolean,
  ): CancelSubscription

  /* HOUSE KEEPING FUNCTIONS */

  /**
   * Dispose of this Pond, stopping all underlying async operations.
   */
  dispose(): void

  /**
   * Information about the current pond
   */
  info(): PondInfo

  /**
   * Retrieve an Observable of `PondState`. It emits a new value whenever the internal state of the underlying Pond changes.
   */
  getPondState(): Observable<PondState>

  /**
   * Wait for the node to get in sync with the swarm.
   * It is strongly recommended that any interaction with the Pond is delayed until the Observable.
   * To obtain progress information about the sync, look at the intermediate values emitted by the Observable.
   */
  waitForSwarmSync(): Observable<SplashState>

  /**
   * Get an object that offers a number of functions related purely to events (no Fish).
   */
  events: () => RxEventFn

  /** The underlying plain Pond instance */
  originalPond: Pond
}

const wrap = (pond: Pond): RxPond => ({
  emit: <E>(tags: Tags<E>, event: E) => {
    return new Observable(o =>
      pond.emit(tags, event).subscribe(() => {
        o.next(undefined)
        o.complete()
      }),
    )
  },

  observe: <S, E>(fish: Fish<S, E>) =>
    new Observable<S>(o =>
      pond.observe<S, E>(
        fish,
        v => o.next(v),
        err => o.error(err),
      ),
    ),

  observeAll: <ESeed, S>(
    seedEventsSelector: Where<ESeed>,
    makeFish: (seedEvent: ESeed) => Fish<S, any> | undefined,
    opts: ObserveAllOpts,
  ): Observable<S[]> =>
    new Observable<S[]>(o =>
      pond.observeAll<ESeed, S>(seedEventsSelector, makeFish, opts, v =>
        o.next(v),
      ),
    ),
  observeOne: <ESeed, S>(
    seedEventsSelector: Where<ESeed>,
    makeFish: (seedEvent: ESeed) => Fish<S, any>,
  ): Observable<S> =>
    new Observable<S>(o =>
      pond.observeOne<ESeed, S>(
        seedEventsSelector,
        makeFish,
        v => o.next(v),
        err => o.error(err),
      ),
    ),

  run: <S, EWrite>(fish: Fish<S, any>, fn: StateEffect<S, EWrite>) => {
    return new Observable(o =>
      pond.run(fish, fn).subscribe(() => {
        o.next(undefined)
        o.complete()
      }),
    )
  },

  keepRunning: pond.keepRunning,

  dispose: pond.dispose,

  info: pond.info,

  getPondState: () => new Observable(o => pond.getPondState(v => o.next(v))),

  waitForSwarmSync: () =>
    new Observable(o =>
      pond.waitForSwarmSync({
        onProgress: v => o.next(v),
        onSyncComplete: () => o.complete(),
      }),
    ),

  events: () => mkEvents(pond),
  originalPond: pond,
})

export const RxPond = {
  default: async (manifest: AppManifest): Promise<RxPond> =>
    wrap(await Pond.default(manifest)),

  of: async (params: Parameters<typeof Pond['of']>): Promise<RxPond> =>
    wrap(await Pond.of(...params)),

  from: wrap,
}

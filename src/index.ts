/*
 * Copyright 2020 Actyx AG
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
    CancelSubscription,
    ConnectivityStatus,
    Fish,
    Pond,
    PondInfo,
    PondState,
    SplashState,
    StateEffect,
    Tags,
} from '@actyx/pond'
import { Observable } from 'rxjs'

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
    emit<E>(tags: Tags<E>, event: E): Observable<void>

    /* AGGREGATION */

    /**
     * Observe the current state of a Fish.
     *
     * Caching is done based on the `fishId` inside the `fish`, i.e. if a fish with the included
     * `fishId` is already known, that other Fish’s ongoing aggregation will be used instead of
     * starting a new one.
     *
     * @param fish       - Complete Fish information.
     * @returns            An Observable of updated states. Each published state will be strictler newer than the last one.
     *                     (One state is buffered and immediately supplied to new subscribers.)
     */
    observe<S, E>(fish: Fish<S, E>): Observable<S>

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
    ): Observable<void>

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
     * Get an Observable of this node’s connectivity information. Updates periodically.
     */
    getNodeConnectivity(): Observable<ConnectivityStatus>

    /**
     * Wait for the node to get in sync with the swarm.
     * It is strongly recommended that any interaction with the Pond is delayed until the Observable.
     * To obtain progress information about the sync, look at the intermediate values emitted by the Observable.
     */
    waitForSwarmSync(): Observable<SplashState>

    /** The underlying plain Pond instance */
    originalPond: Pond
}

const wrap = (pond: Pond): RxPond => ({
    emit: <E>(tags: Tags<E>, event: E) => {
        const p = pond.emit(tags, event)
        return new Observable(o => p.subscribe(() => o.complete()))
    },

    observe: <S, E>(fish: Fish<S, E>) =>
        new Observable<S>(o => pond.observe<S, E>(fish, v => o.next(v))),

    run: <S, EWrite>(fish: Fish<S, any>, fn: StateEffect<S, EWrite>) => {
        const p = pond.run(fish, fn)
        return new Observable(o => p.subscribe(() => o.complete()))
    },

    keepRunning: pond.keepRunning,

    dispose: pond.dispose,

    info: pond.info,

    getPondState: () => new Observable(o => pond.getPondState(v => o.next(v))),

    getNodeConnectivity: () =>
        new Observable(o =>
            pond.getNodeConnectivity({ callback: v => o.next(v) }),
        ),

    waitForSwarmSync: () =>
        new Observable(o =>
            pond.waitForSwarmSync({
                onProgress: v => o.next(v),
                onSyncComplete: () => o.complete(),
            }),
        ),

    originalPond: pond,
})

export const RxPond = {
    default: async (): Promise<RxPond> => wrap(await Pond.default()),

    of: async (params: Parameters<typeof Pond['of']>): Promise<RxPond> =>
        wrap(await Pond.of(...params)),

    from: wrap,
}

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
  ActyxEvent,
  AutoCappedQuery,
  EarliestQuery,
  EventChunk,
  EventSubscription,
  Metadata,
  OffsetMap,
  Pond,
  RangeQuery,
  TaggedEvent,
  Where,
} from '@actyx/pond'
import { from, Observable } from 'rxjs'

export type RxEventFn = {
  /** Get the current latest offsets known locally. */
  currentOffsets: () => Observable<OffsetMap>
  /**
   * Get all known events between the given offsets, in one array.
   *
   * @param query       - `RangeQuery` object specifying the desired set of events.
   *
   * @returns A Promise that resolves to the complete set of queries events.
   */
  queryKnownRange: (query: RangeQuery) => Observable<ActyxEvent[]>
  /**
   * Get all known events between the given offsets, in chunks.
   * This is helpful if the result set is too large to fit into memory all at once.
   * The returned `Promise` resolves after all chunks have been delivered.
   *
   * @param query       - `RangeQuery` object specifying the desired set of events.
   * @param chunkSize   - Maximum size of chunks. Chunks may be smaller than this.
   * @param onChunk     - Callback that will be invoked with every chunk, in sequence.
   *
   * @returns A Promise that resolves when all chunks have been delivered to the callback.
   */
  queryKnownRangeChunked: (
    query: RangeQuery,
    chunkSize: number,
  ) => Observable<EventChunk>
  /**
   * Query all known events that occurred after the given `lowerBound`.
   *
   * @param query  - `OpenEndedQuery` object specifying the desired set of events.
   *
   * @returns An `EventChunk` with the result and its bounds.
   *          The contained `upperBound` can be passed as `lowerBound` to a subsequent call of this function to achieve exactly-once delivery of all events.
   */
  queryAllKnown: (query: AutoCappedQuery) => Observable<EventChunk>
  /**
   * Query all known events that occurred after the given `lowerBound`, in chunks.
   * This is useful if the complete result set is potentially too large to fit into memory at once.
   *
   * @param query       - `OpenEndedQuery` object specifying the desired set of events.
   * @param chunkSize   - Maximum size of chunks. Chunks may be smaller than this.
   * @param onChunk     - Callback that will be invoked for each chunk, in sequence. Second argument is an offset map covering all events passed as first arg.
   *
   * @returns A `Promise` that resolves to updated offset-map after all chunks have been delivered.
   */
  queryAllKnownChunked: (
    query: AutoCappedQuery,
    chunkSize: number,
  ) => Observable<EventChunk>
  /**
   * Subscribe to all events fitting the `query` after `lowerBound`.
   * They will be delivered in chunks of at most 5000.
   * New events are delivered as they become known.
   * The subscription goes on forever, until manually cancelled.
   *
   * @param query      - `EventSubscription` object specifying the desired set of events.
   * @param onChunk    - Callback that will be invoked for each chunk, in sequence. Second argument is the updated offset map.
   *
   * @returns A function that can be called in order to cancel the subscription.
   */
  subscribe: (query: EventSubscription) => Observable<EventChunk>
  /**
   * Observe always the **earliest** event matching the given query.
   * If there is an existing event fitting the query, `onNewEarliest` will be called with that event.
   * Afterwards, `onNewEarliest` will be called whenever a new event becomes known that is older than the previously passed one.
   * Note that the 'earliest' event may keep updating as new events become known.
   *
   * @param query                - Query to select the set of events.
   * @param onNewEarliest        - Callback that will be invoked whenever there is a 'new' earliest event.
   *
   * @returns A function that can be called in order to cancel the subscription.
   *
   * @beta
   */
  observeEarliest: <E>(
    query: EarliestQuery<E>,
  ) => Observable<{ event: E; metadata: Metadata }>
  /**
   * Observe always the **latest** event matching the given query.
   * If there is an existing event fitting the query, `onNewLatest` will be called with that event.
   * Afterwards, `onNewLatest` will be called whenever a new event becomes known that is younger than the previously passed one.
   *
   * @param query                - Query to select the set of events.
   * @param onNewLatest          - Callback that will be invoked for each new latest event.
   *
   * @returns A function that can be called in order to cancel the subscription.
   *
   * @beta
   */
  observeLatest: <E>(
    query: EarliestQuery<E>,
  ) => Observable<{ event: E; metadata: Metadata }>
  /**
   * Among all events matching the query, find one that best matches some property.
   * This is useful for finding the event that has `min` or `max` of something.
   * E.g. `shouldReplace = (candidate, cur) => candidate.meta.timestampMicros > cur.meta.timestampMicros` keeps finding the event with the highest timestamp.
   *
   * @param query         - Query to select the set of `candidate` events.
   * @param shouldReplace - Should `candidate` replace `cur`?
   * @param onReplaced    - Callback that is evoked whenever replacement happens, i.e. we found a new best match.
   *
   * @returns A function that can be called in order to cancel the subscription.
   */
  observeBestMatch: <E>(
    query: Where<E>,
    shouldReplace: (candidate: ActyxEvent<E>, cur: ActyxEvent<E>) => boolean,
  ) => Observable<{ event: E; metadata: Metadata }>
  /**
   * Apply a `reduce` operation to all events matching `query`, in no specific order.
   * This is useful for operations that are **commutative**, e.g. `sum` or `product`.
   *
   * @param query         - Query to select the set of events to pass to the reducer.
   * @param reduce        - Compute a new state `R` by integrating the next event.
   * @param initial       - Initial, neutral state, e.g. `0` for a `sum` operation.
   * @param onUpdate      - Callback that is evoked with updated results.
   *                        If a batch of events was applied, `onUpdate` will only be called once, with the final new state.
   *
   * @returns A function that can be called in order to cancel the subscription.
   */
  observeUnorderedReduce: <R, E>(
    query: Where<E>,
    reduce: (acc: R, event: E, metadata: Metadata) => R,
    initial: R,
  ) => Observable<R>
  /**
   * Emit a number of events with tags attached.
   *
   * @param events - Events to emit.
   *
   * @returns        A `PendingEmission` object that can be used to register callbacks with the emission’s completion.
   */
  emit: (events: ReadonlyArray<TaggedEvent>) => Observable<void>
}

export const mkEvents = (pond: Pond): RxEventFn => {
  const events = pond.events()
  return {
    currentOffsets: () => from(events.currentOffsets()),

    queryKnownRange: query => from(events.queryKnownRange(query)),

    queryKnownRangeChunked: (query, chunkSize) =>
      new Observable(o => {
        events
          .queryKnownRangeChunked(query, chunkSize, c => o.next(c))
          .then(_ => o.complete())
        // can't terminate query
        return () => undefined
      }),

    queryAllKnown: query => from(events.queryAllKnown(query)),

    queryAllKnownChunked: (query, chunkSize) =>
      new Observable(o => {
        events
          .queryAllKnownChunked(query, chunkSize, c => o.next(c))
          .then(_ => o.complete())
        // can't terminate query
        return () => undefined
      }),

    subscribe: query =>
      new Observable(o => events.subscribe(query, c => o.next(c))),

    observeEarliest: <E>(
      query: EarliestQuery<E>,
    ): Observable<{ event: E; metadata: Metadata }> =>
      new Observable(o =>
        events.observeEarliest(query, (event, metadata) =>
          o.next({ event, metadata }),
        ),
      ),

    observeLatest: <E>(
      query: EarliestQuery<E>,
    ): Observable<{ event: E; metadata: Metadata }> =>
      new Observable(o =>
        events.observeLatest(query, (event, metadata) =>
          o.next({ event, metadata }),
        ),
      ),

    observeBestMatch: <E>(
      query: Where<E>,
      shouldReplace: (candidate: ActyxEvent<E>, cur: ActyxEvent<E>) => boolean,
    ): Observable<{ event: E; metadata: Metadata }> =>
      new Observable(o =>
        events.observeBestMatch(query, shouldReplace, (event, metadata) =>
          o.next({ event, metadata }),
        ),
      ),

    observeUnorderedReduce: <R, E>(
      query: Where<E>,
      reduce: (acc: R, event: E, metadata: Metadata) => R,
      initial: R,
    ): Observable<R> =>
      new Observable(o =>
        events.observeUnorderedReduce(query, reduce, initial, state =>
          o.next(state),
        ),
      ),

    emit: (e: ReadonlyArray<TaggedEvent>): Observable<void> =>
      from(events.emit(e).toPromise()),
  }
}

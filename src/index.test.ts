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
import { Fish, FishId, Tag, Tags } from '@actyx/pond'
import { RxPond } from '.'
import { finalize, tap, toArray } from 'rxjs/operators'

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

const mkForTest = async (): Promise<[
  RxPond,
  Tag<string>,
  Fish<string, string>,
  () => Promise<void>,
]> => {
  const pond = await RxPond.default({
    appId: 'com.example.test',
    displayName: 'My test app',
    version: '0.0.1',
  })

  const MyTag = Tag<string>(`myTag+${Date.now()}+${Math.random()}`)
  const MyFish: Fish<string, string> = {
    fishId: FishId.of('MyFish', 'Fish1', 1),
    initialState: '',
    onEvent: (_, e) => e,
    where: MyTag,
  }

  const cleanup = async () => {
    pond.dispose()
    await sleep(1_000)
  }
  return [pond, MyTag, MyFish, cleanup]
}

describe('rx-pond', () => {
  it('observable returned by emit correctly returns an undefined', async () => {
    expect.assertions(1)
    const [pond, tag, _, cleanup] = await mkForTest()
    // console.log('1')
    const res = await pond
      .emit(tag, 'string 1')
      .pipe(toArray())
      .toPromise()

    await cleanup()
    expect(res).toEqual([undefined])
  })
  it('observable returned by run correctly returns an undefined', async () => {
    expect.assertions(1)
    const [pond, _, fish, cleanup] = await mkForTest()
    const res = await pond
      .run(fish, (_, enqueue, __) => {
        enqueue(Tags('tag'), 'string')
      })
      .pipe(toArray())
      .toPromise()

    await cleanup()
    expect(res).toEqual([undefined])
  })
})

// Copyright 2017 Nukomeet & contributors. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { parse } from 'url';
import make from 'axios';

type Response = {
  data?: Array<{}>,
  next?: { path?: string },
  previous?: { path?: string },
  paging?: { next: string, previous: string },
} | undefined;


class InstagramGraph {
  queryId: string;
  baseURL: string;

  constructor(queryId: string, debug: string) {
    this.queryId = queryId;
    this.baseURL = `https://www.instagram.com/`;
  }

  async request(path: string, params: {}, method = 'GET'): Promise<Response> {
    try {
      const response = await make({
        headers: { 'User-Agent': 'Facebook Graph Client' },
        method,
        params: Object.assign({ queryId: this.queryId }, { variables: params }),
        url: `${this.baseURL}/${path}`
      })

      return response;
    } catch (error) {
      console.log(error.response.statusText);
      console.log(`  ${error.message}`);
      console.log(`  ${error.response.headers['www-authenticate']}`);
    }
  }


  async get(requestPath: string, params: {}): Promise<Response> {
    const response = await this.request(requestPath, params);

    if (response) {
      let result: Response = response;

      return result;
    }
  }

  async paginate(path: string, params: { q?: string, type?: string, fields?: {}, limit: number }, size: number): Promise<Array<{}>> {
    let result: Response = await this.get(path, params);
    let entities = [];
    let counter = entities.length;

    const { limit }: { limit: number } = params;

    while (result.next && counter < size) {
      result = await this.get(result.next.path, { limit });
      entities.push(...result.data);
    }

    return entities.slice(0, size);
  }

  async explore({ q }: { q: string }, size: number = 25): Promise<Array<{}>> {
    return await this.paginate('/graphql/query', { q, limit: 25 }, size);
  }
}

module.exports = InstagramGraph;

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
const _ = require('lodash');

type Response = {
  data?: Array<{}>,
  next?: { path?: string },
  previous?: { path?: string },
  paging?: { next: string, previous: string },
} | undefined;

type ParsedPosts = {
  posts: Array<Post>,
  cursor: string,
  hasMore: boolean
} | undefined

type Post = {
  id: string,
  shortcode: string,
  media: string,
  description: string
}

class InstagramGraph {
  queryId: string;
  baseURL: string;

  constructor(queryId: string, debug: string) {
    this.queryId = queryId;
    this.baseURL = `https://www.instagram.com/`;
  }

  async request(path: string, params: {}, method = 'GET'): Promise<Response> {
    try {
      console.log(`${this.baseURL}${path}/?query_id=${this.queryId}&variables=${JSON.stringify(params)}`)
      const response = await make(`${this.baseURL}${path}/?query_id=${this.queryId}&variables=${JSON.stringify(params)}`)

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


  parsePosts(response: Response) : ParsedPosts {
    if(!response) return;

    const result = _.get(response.data, 'data.hashtag.edge_hashtag_to_media');

    const posts = result['edges'].map((item : any) => {
      return {
        id: _.get(item, 'node.id'),
        shortcode: _.get(item, 'node.shortcode'),
        media: _.get(item, 'node.display_url'),
        description: _.get(item, 'node.edge_media_to_caption.edges[0].node.text')
      };
    });

    return {
      posts,
      cursor: _.get(result, 'page_info.end_cursor'),
      hasMore: _.get(result, 'page_info.has_next_page')
    };
  }

  async paginate(path: string, params: { tag_name: string, first?: number }, size: number): Promise<Array<{}>> {
    let entities = [];
    let counter = 0;
    let hasMore = true;

    while (hasMore && counter < size) {
      let result = this.parsePosts(await this.get(path, params));
      if(!result) break;
      try {
        entities.push(...result.posts);
        counter = entities.length;
        hasMore = result.hasMore;
      } catch(e) {
        break;
      }
    }

    return entities.slice(0, size);
  }

  async explore(tag_name: string, size: number = 25): Promise<Array<{}>> {
    return await this.paginate('graphql/query', { tag_name, first: 25 }, size);
  }
}

module.exports = InstagramGraph;

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
import make, { AxiosResponse } from 'axios';
const _ = require('lodash');

function sleep(ms: number) {
  return new Promise((resolve) => {
    // wait 3s before calling fn(par)
    setTimeout(() => resolve(), ms)
  })
}

type Response = {
  data?: {},
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

type User = {
  user: {
    id: string
  },
}

type DataType = 'user' | 'tag';

const paths = {
  user: 'data.user.edge_owner_to_timeline_media',
  tag: 'data.hashtag.edge_hashtag_to_media'
}

function parseData(type: DataType, response: Response) : ParsedPosts {
  if(!response) return;

  const result = _.get(response.data, paths[type]);

  const posts = result['edges'].map((postData: any) : Post => ({
    id: _.get(postData, 'node.id'),
    shortcode: _.get(postData, 'node.shortcode'),
    media: _.get(postData, 'node.display_url'),
    description: _.get(postData, 'node.edge_media_to_caption.edges[0].node.text')
  }));

  return {
    posts,
    cursor: _.get(result, 'page_info.end_cursor'),
    hasMore: _.get(result, 'page_info.has_next_page')
  };
}

class InstagramGraph {
  userQueryId: string;
  queryIds: { [type: string]: string };
  baseURL: string;

  constructor(tagQueryId: string, userQueryId: string) {
    this.baseURL = `https://www.instagram.com/graphql/query/`;

    this.queryIds = {
      user: userQueryId,
      tag: tagQueryId,
    }
  }

  async request(query_id: string, params: {}, method = 'GET'): Promise<Response> {
    let retries = 0;
    while(retries < 3) {
      try {
        const response = await make(`${this.baseURL}?query_id=${query_id}&variables=${JSON.stringify(params)}`)

        return response;
      } catch (error) {
        if(error.response) {
          console.log(error.response.statusText);
          console.log(error.response.data.message);
          console.log('message: ', error.response.data.errors[0].message);
        }
        console.log(`  ${error.message}`);
        if(retries < 3) {
          ++retries;
          console.log('retrying', retries * 50, 's');
          await sleep(retries * 50000);
        }
      }
    }
  }


  async get(type: DataType, params: {}): Promise<Response> {
    const response = await this.request(this.queryIds[type], params);

    if (response) {
      let result: Response = response;

      return result;
    }
  }

  async paginate(type: DataType, params: { 
      id?: string, 
      tag_name?: string, 
      first?: number, 
      after?: string 
    }, size: number): Promise<Array<{}>> {
    let entities = [];
    let counter = 0;
    let hasMore = true;

    while (hasMore && counter < size) {
      let result;
      try {
        result = parseData(type, await this.get(type, params));
      } catch(e) {
        console.log(`error when getting media`);
        console.log(`params ${JSON.stringify(params)}`);
        console.log(e.message);
        break;
      }
      if(!result) break;
      entities.push(...result.posts);
      counter = entities.length;
      hasMore = result.hasMore;
      params.after = result.cursor;
      console.log(counter)
    }

    return entities.slice(0, size);
  }

  async getTag(tag_name: string, size: number = 25): Promise<Array<{}>> {
    return await this.paginate('tag', { tag_name, first: 400 }, size);
  }

  async getUser(name: string, size: number = 25): Promise<Array<{}>> {
    const data = <AxiosResponse<User>> await make(`https://www.instagram.com/${name}/?__a=1`);
    const id = data.data.user.id;
    return await this.paginate('user', { id, first: 400 }, size);
  }
}

module.exports = InstagramGraph;

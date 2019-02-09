import React from 'react';
import test from 'ava';
import { shallow } from 'enzyme';
import PostList from '../../components/PostList';

const posts = [
  { name: 'Prashant', title: 'Hello ReactBlogApp', slug: 'hello-ReactBlogApp', cuid: 'f34gb2bh24b24b2', content: "All cats meow 'ReactBlogApp!'" },
  { name: 'Mayank', title: 'Hi ReactBlogApp', slug: 'hi-ReactBlogApp', cuid: 'f34gb2bh24b24b3', content: "All dogs bark 'ReactBlogApp!'" },
];

test('renders the list', t => {
  const wrapper = shallow(
    <PostList posts={posts} handleShowPost={() => {}} handleDeletePost={() => {}} />
  );

  t.is(wrapper.find('PostListItem').length, 2);
});

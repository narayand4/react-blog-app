import test from 'ava';
import request from 'supertest';
import app from '../../server';
import Post from '../post';
import { connectDB, dropDB } from '../../util/test-helpers';

// Initial posts added into test db
const posts = [
  new Post({ name: 'Prashant', title: 'Hello ReactBlogApp', slug: 'hello-ReactBlogApp', cuid: 'f34gb2bh24b24b2', content: "All cats meow 'ReactBlogApp!'" }),
  new Post({ name: 'Mayank', title: 'Hi ReactBlogApp', slug: 'hi-ReactBlogApp', cuid: 'f34gb2bh24b24b3', content: "All dogs bark 'ReactBlogApp!'" }),
];

test.before('connect to mockgoose', async () => {
  await connectDB();
});

test.beforeEach('connect and add two post entries', async () => {
  await Post.create(posts).catch(() => 'Unable to create posts');
});

test.afterEach.always(async () => {
  await dropDB();
});

test.serial('Should correctly give number of Posts', async t => {
  t.plan(2);

  const res = await request(app)
    .get('/api/posts')
    .set('Accept', 'application/json');

  t.is(res.status, 200);
  t.deepEqual(posts.length, res.body.posts.length);
});

test.serial('Should send correct data when queried against a cuid', async t => {
  t.plan(2);

  const post = new Post({ name: 'Foo', title: 'bar', slug: 'bar', cuid: 'f34gb2bh24b24b2', content: 'Hello ReactBlogApp says Foo' });
  post.save();

  const res = await request(app)
    .get('/api/posts/f34gb2bh24b24b2')
    .set('Accept', 'application/json');

  t.is(res.status, 200);
  t.is(res.body.post.name, post.name);
});

test.serial('Should correctly add a post', async t => {
  t.plan(2);

  const res = await request(app)
    .post('/api/posts')
    .send({ post: { name: 'Foo', title: 'bar', content: 'Hello ReactBlogApp says Foo' } })
    .set('Accept', 'application/json');

  t.is(res.status, 200);

  const savedPost = await Post.findOne({ title: 'bar' }).exec();
  t.is(savedPost.name, 'Foo');
});

test.serial('Should correctly delete a post', async t => {
  t.plan(2);

  const post = new Post({ name: 'Foo', title: 'bar', slug: 'bar', cuid: 'f34gb2bh24b24b2', content: 'Hello ReactBlogApp says Foo' });
  post.save();

  const res = await request(app)
    .delete(`/api/posts/${post.cuid}`)
    .set('Accept', 'application/json');

  t.is(res.status, 200);

  const queriedPost = await Post.findOne({ cuid: post.cuid }).exec();
  t.is(queriedPost, null);
});

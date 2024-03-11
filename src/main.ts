import { Devvit } from '@devvit/public-api';

const ANON_COMMENT_JOB = 'anoncommentjob';
const ANON_REPLY_JOB = 'anonreplyjob';
const ANON_POST_JOB = 'anonpostjob';

Devvit.configure({
  redditAPI: true,
});

Devvit.addMenuItem({
  label: 'Post Anon Comment',
  location: 'post',
  onPress: async (event, context) => {
    const postId = event.targetId;
    context.ui.showForm(anonymousCommentFormOne, { postId });
  },
});

Devvit.addMenuItem({
  label: 'Create Anon Post',
  location: 'subreddit',
  onPress: async (event, context) => {
    const postId = event.targetId;
    context.ui.showForm(anonymousPostForm, { postId });
  },
});

Devvit.addMenuItem({
  label: 'Post Anon Comment',
  location: 'comment',
  onPress: async (event, context) => {
    const commentId = event.targetId;
    context.ui.showForm(anonymousCommentFormTwo, { commentId });
  },
});

Devvit.addSchedulerJob({
  name: ANON_COMMENT_JOB,
  onRun: async (event, context) => {
    const { userId, postId, commentText } = event.data!;

    try {
      const comment = await context.reddit.submitComment({
        id: postId,
        text: commentText,
      });

      context.ui.showToast(`Anonymous Comment Successfully Posted: ${commentText}`);
    } catch (error) {
      console.error('Error posting anonymous comment:', error);
      context.ui.showToast(`Error posting anonymous comment`);
    }
  },
});

Devvit.addSchedulerJob({
  name: ANON_REPLY_JOB,
  onRun: async (event, context) => {
    const { userId, commentId, replyText } = event.data!;

    try {
      const reply = await context.reddit.submitComment({
        id: commentId,
        text: replyText,
      });

      context.ui.showToast(`Anonymous Reply Successfully Posted: ${replyText}`);
    } catch (error) {
      console.error('Error posting anonymous reply:', error);
      context.ui.showToast(`Error posting anonymous reply`);
    }
  },
});

Devvit.addSchedulerJob({
  name: ANON_POST_JOB,
  onRun: async (event, context) => {
    const { userId, title, text } = event.data!;

    try {
      const post = await context.reddit.submitPost({
        subredditName: 'AnonSnoo',
        title: title,
        text: text,
      });
    } catch (error) {
      console.error('Error posting anonymous post:', error);
    }
  },
});

const anonymousCommentFormOne = Devvit.createForm(
  () => {
    return {
      fields: [
        {
          name: 'commentText',
          label: 'Comment Text',
          type: 'string',
        },
      ],
      title: 'Post Anon Comment',
      acceptLabel: 'Post Comment',
      cancelLabel: 'Cancel',
    };
  },
  async ({ values }, context) => {
    const commentText = values['commentText'];
    const postId = context.postId ?? '';

    const post = await context.reddit.getPostById(postId);
    if (post.locked) {
      context.ui.showToast('Cannot comment on locked posts');
      return;
    }

    try {
      await context.scheduler.runJob({
        name: ANON_COMMENT_JOB,
        data: {
          userId: context.userId,
          postId: postId,
          commentText: commentText,
        },
        runAt: new Date(Date.now() + 200),
      });

      context.ui.showToast(`Anonymous comment posted successfully: ${commentText}`);
    } catch (error) {
      console.error('Error initiating anonymous comment job:', error);
      context.ui.showToast('Error initiating anonymous comment job');
    }
  }
);

const anonymousCommentFormTwo = Devvit.createForm(
  () => {
    return {
      fields: [
        {
          name: 'commentText',
          label: 'Comment Text',
          type: 'string',
        },
      ],
      title: 'Post Anon Comment',
      acceptLabel: 'Post Comment',
      cancelLabel: 'Cancel',
    };
  },
  async ({ values }, context) => {
    const commentText = values['commentText'];
    const commentId = context.commentId ?? '';
    const postId = context.postId ?? '';

    const comment = await context.reddit.getCommentById(commentId);
    if (comment.locked) {
      context.ui.showToast('Cannot comment on locked comments');
      return;
    }

    try {
      console.log('Attempting to post comment:', commentText, 'on post:', postId);
      const comment = await context.reddit.submitComment({
        id: postId,
        text: commentText,
      });

      console.log('Comment posted:', comment);
      context.ui.showToast(`Anonymous Comment Successfully Posted: ${commentText}`);
    } catch (error) {
      console.error('Error posting anonymous comment:', error);
      context.ui.showToast(`Error posting anonymous comment`);
    }

    try {
      await context.scheduler.runJob({
        name: ANON_REPLY_JOB,
        data: {
          userId: context.userId,
          commentId: commentId,
          replyText: commentText,
        },
        runAt: new Date(Date.now() + 200),
      });

      context.ui.showToast(`Anonymous reply posted successfully: ${commentText}`);
    } catch (error) {
      console.error('Error initiating anonymous reply job:', error);
      context.ui.showToast('Error initiating anonymous reply job');
    }
  }
);

const anonymousPostForm = Devvit.createForm(
  () => {
    return {
      fields: [
        {
          name: 'title',
          label: 'Title',
          type: 'string',
        },
        {
          name: 'text',
          label: 'Text',
          type: 'string',
        },
      ],
      title: 'Create Anon Post',
      acceptLabel: 'Create Post',
      cancelLabel: 'Cancel',
    };
  },
  async ({ values }, context) => {
    const title = values['title'];
    const text = values['text'];

    try {
      await context.scheduler.runJob({
        name: ANON_POST_JOB,
        data: {
          userId: context.userId,
          subreddit: 'AnonSnoo',
          title: title,
          text: text,
        },
        runAt: new Date(Date.now() + 200),
      });

      context.ui.showToast(`Anonymous post created successfully: ${title}`);
    } catch (error) {
      console.error('Error initiating anonymous post job:', error);
      context.ui.showToast('Error initiating anonymous post job');
    }
  }
);
export default Devvit;

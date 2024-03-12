import { Devvit } from '@devvit/public-api';

const ANON_COMMENT_JOB = 'anoncommentjob';
const ANON_REPLY_JOB = 'anonreplyjob';
const ANON_POST_JOB = 'anonpostjob';

Devvit.configure({
  redditAPI: true,
});

async function checkIfBanned(context) {
  const currentSubreddit = await context.reddit.getCurrentSubreddit();
  const allBannedUsers = await context.reddit.getBannedUsers({
    subredditName: currentSubreddit.name,
  }).all();

  const isBanned = allBannedUsers.find((user) => user.id === context.userId);

  if (isBanned) {
    context.ui.showToast('You are banned.');
    return true;
  }

  return false;
}

Devvit.addMenuItem({
  label: 'Post Anon Comment',
  location: 'post',
  onPress: async (event, context) => {
    if (await checkIfBanned(context)) return; // check if user is banned

    const postId = event.targetId;
    context.ui.showForm(anonymousCommentFormOne, { postId });
  },
});

Devvit.addMenuItem({
  label: 'Post Anon Post',
  location: 'subreddit',
  onPress: async (event, context) => {
    if (await checkIfBanned(context)) return; // check if user is banned
    context.ui.showForm(anonymousPostForm);
  },
});

Devvit.addMenuItem({
  label: 'Post Anon Comment',
  location: 'comment',
  onPress: async (event, context) => {
    if (await checkIfBanned(context)) return; // check if user is banned

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

      // send modmail
      const user = await context.reddit.getUserById(userId);
      const modMailText = `User ${user.username} posted an anonymous comment: ${commentText} on post: ${postId}. Link: ${comment.url}`;
      const currentSubreddit = await context.reddit.getCurrentSubreddit();
      const { conversation } = await context.reddit.modMail.createConversation({
        subredditName: currentSubreddit.name,
        subject: 'New Anonymous Comment',
        body: modMailText,
        to: null, // for internal moderator discussion
      });
    } catch (error) {
      console.error('Error posting anonymous comment:', error);
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

      // send modmail
      const user = await context.reddit.getUserById(userId);
      const modMailText = `User ${user.username} posted an anonymous reply: ${replyText} on comment: ${commentId}. Link: ${reply.url}`;
      const currentSubreddit = await context.reddit.getCurrentSubreddit();
      const { conversation } = await context.reddit.modMail.createConversation({
        subredditName: currentSubreddit.name,
        subject: 'New Anonymous Reply',
        body: modMailText,
        to: null,
      });
    } catch (error) {
      console.error('Error posting anonymous reply:', error);
    }
  },
});


Devvit.addSchedulerJob({
  name: ANON_POST_JOB,
  onRun: async (event, context) => {
    const { userId, title, text } = event.data!;
    const currentSubreddit = await context.reddit.getCurrentSubreddit();
    
    try {
      const post = await context.reddit.submitPost({
        subredditName: currentSubreddit.name,
        title: title,
        text: text,
      });

      // send a modmail
      const user = await context.reddit.getUserById(userId);
      const modMailText = `User ${user.username} posted an anonymous post: ${title}. Link: ${post.url}`;
      
      const { conversation } = await context.reddit.modMail.createConversation({
        subredditName: currentSubreddit.name,
        subject: 'New Anonymous Post',
        body: modMailText,
        to: null, // for internal moderator discussion
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
        runAt: new Date(Date.now() + 1),
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
          name: 'replyText',
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
    const replyText = values['replyText'];
    const commentId = context.commentId ?? '';
    const postId = context.postId ?? '';

    const comment = await context.reddit.getCommentById(commentId);
    if (comment.locked) {
      context.ui.showToast('Cannot comment on locked comments');
      return;
    }

    try {
      console.log('Attempting to post comment:', replyText, 'on post:', postId);
      const comment = await context.reddit.submitComment({
        id: postId,
        text: replyText,
      });

      console.log('Comment posted:', comment);
      context.ui.showToast(`Anonymous Comment Successfully Posted: ${replyText}`);
    } catch (error) {
      console.error('Error posting anonymous comment:', error);
    //  context.ui.showToast(`Error posting anonymous comment`);
    }

    try {
      await context.scheduler.runJob({
        name: ANON_REPLY_JOB,
        data: {
          userId: context.userId,
          commentId: commentId,
          replyText: replyText,
        },
        runAt: new Date(Date.now() + 1),
      });

      context.ui.showToast(`Anonymous reply posted successfully: ${replyText}`);
    } catch (error) {
    console.error('Error initiating anonymous reply job:', error);
    //  context.ui.showToast('Error initiating anonymous reply job');
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
    const currentSubreddit = await context.reddit.getCurrentSubreddit();


    try {
      await context.scheduler.runJob({
        name: ANON_POST_JOB,
        data: {
          userId: context.userId,
          subreddit: currentSubreddit.name,
          title: title,
          text: text,
        },
        runAt: new Date(Date.now() + 1),
      });

      context.ui.showToast(`Anonymous post created successfully: ${title}`);
    } catch (error) {
      console.error('Error initiating anonymous post job:', error);
      context.ui.showToast('Error initiating anonymous post job');
    }
  }
);
export default Devvit;

// i need more coffee

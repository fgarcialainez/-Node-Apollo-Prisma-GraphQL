const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { APP_SECRET, getUserId } = require('../utils');

async function signup(parent, args, context, info) {
  const password = await bcrypt.hash(args.password, 10);
  const user = await context.prisma.user.create({
    data: { ...args, password },
  });

  const token = jwt.sign({ userId: user.id }, APP_SECRET);

  return {
    token,
    user,
  };
}

async function login(parent, args, context, info) {
  // Validate the user
  const user = await context.prisma.user.findUnique({
    where: { email: args.email },
  });
  if (!user) {
    throw new Error('No such user found');
  }

  // Check teh passwword
  const valid = await bcrypt.compare(args.password, user.password);
  if (!valid) {
    throw new Error('Invalid password');
  }

  // Sign the JWT token
  const token = jwt.sign({ userId: user.id }, APP_SECRET);

  // Return the token + user
  return {
    token,
    user,
  };
}

// Create a new link entry
async function post(parent, args, context, info) {
  const { userId } = context;

  return await context.prisma.link.create({
    data: {
      url: args.url,
      description: args.description,
      postedBy: { connect: { id: userId } },
    },
  });
}

// Create a new vote for a given link
async function vote(parent, args, context, info) {
  // Get the user identifier
  const userId = getUserId(context);

  // Check if the vote for the given user already exists
  const vote = await context.prisma.vote.findUnique({
    where: {
      linkId_userId: {
        linkId: Number(args.linkId),
        userId: userId,
      },
    },
  });

  if (Boolean(vote)) {
    throw new Error(`Already voted for link: ${args.linkId}`);
  }

  // Create the new vote
  const newVote = context.prisma.vote.create({
    data: {
      user: { connect: { id: userId } },
      link: { connect: { id: Number(args.linkId) } },
    },
  });
  return newVote;
}

module.exports = {
  signup,
  login,
  post,
  vote,
};

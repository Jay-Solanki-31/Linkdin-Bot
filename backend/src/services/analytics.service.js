import GeneratedPost from "../models/generatedPost.model.js";
import PostAnalytics from "../models/postAnalytics.model.js";

export async function saveAnalyticsSnapshot(payload) {

  const {
    linkedinPostUrn,
    linkedinPostUrl,

    impressions = 0,
    likes = 0,
    comments = 0,
    reposts = 0,

    collectedAt,
  } = payload;

  console.log(
    "Looking for post:",
    linkedinPostUrn
  );

  const post =
    await GeneratedPost.findOne({
      linkedinPostUrn,
    });


  console.log(
    "Found post:",
    post?._id
  );

  if (!post) {
    console.log(
      `Skipping unknown post: ${linkedinPostUrn}`
    );

    return null;
  }
  const latest =
    await PostAnalytics.findOne({
      linkedinPostUrn,
    }).sort({
      collectedAt: -1,
    });
  if (
    latest &&
    latest.likes === likes &&
    latest.comments === comments &&
    latest.reposts === reposts &&
    latest.impressions === impressions
  ) {

    console.log(
      `Skipping duplicate analytics snapshot: ${linkedinPostUrn}`
    );
    console.log({
      linkedinPostUrn,
      impressions,
      likes,
      comments,
      reposts,
    });
    return latest;
  }
  console.log(
    "Saving new analytics snapshot:"
  );
  console.log({
    linkedinPostUrn,
    impressions,
    likes,
    comments,
    reposts,
  });
  return PostAnalytics.create({
    postId: post._id,
    linkedinPostUrn,
    linkedinPostUrl:
      linkedinPostUrl ||
      post.linkedinPostUrl,

    impressions,
    likes,
    comments,
    reposts,

    source: "extension",

    collectedAt:
      collectedAt ||
      new Date(),
  });
}

export async function getPostAnalytics(
  linkedinPostUrn
) {
  return PostAnalytics.find({
    linkedinPostUrn,
  }).sort({
    collectedAt: 1,
  });
}


export async function getPostsAnalytics() {

  const posts =
    await GeneratedPost.find({
      status: "posted",
      linkedinPostUrn: {
        $exists: true,
      },
    })
      .select(
        "title linkedinPostUrn linkedinPostUrl"
      )
      .lean();

  const urns =
    posts.map(
      (p) => p.linkedinPostUrn
    );

  const analytics =
    await PostAnalytics.aggregate([
      {
        $match: {
          linkedinPostUrn: {
            $in: urns
          }
        }
      },
      {
        $sort: {
          collectedAt: -1
        }
      },
      {
        $group: {
          _id: "$linkedinPostUrn",
          latest: {
            $first: "$$ROOT"
          }
        }
      }
    ]);

  const latestMap = {};

  analytics.forEach((item) => {

    if (
      !latestMap[item.linkedinPostUrn]
    ) {
      latestMap[item.linkedinPostUrn] =
        item;
    }

  });

  return posts.map((post) => {

    const latest =
      latestMap[
      post.linkedinPostUrn
      ];

    return {

      postId: post._id,

      title: post.title,

      linkedinPostUrn:
        post.linkedinPostUrn,

      linkedinPostUrl:
        post.linkedinPostUrl,

      likes:
        latest?.likes || 0,

      impressions:
        latest?.impressions || 0,

      comments:
        latest?.comments || 0,

      reposts:
        latest?.reposts || 0,

      collectedAt:
        latest?.collectedAt || null,
    };

  });

}
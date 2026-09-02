INSERT INTO EmailSummary (
    id,
    emailId,
    shortSummary,
    actionRequired,
    actionItem,
    category,
    importance,
    createdAt,
    includeInDigest,
    topic
  )
VALUES (
    'id:text',
    'emailId:text',
    'shortSummary:text',
    actionRequired:boolean,
    'actionItem:text',
    'category:text',
    'importance:text',
    'createdAt:timestamp without time zone',
    includeInDigest:boolean,
    'topic:text'
  );
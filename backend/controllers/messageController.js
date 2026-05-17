import crypto from "crypto";
import { pool } from "../db.js";

const MAX_MESSAGE_LENGTH=12000;
const VALID_STATUSES=[
"sent",
"delivered",
"read"
];

async function isMember(
userId,
conversationId
){

const result=
await pool.query(
`
SELECT 1
FROM conversation_members
WHERE user_id=$1
AND conversation_id=$2
`,
[
userId,
conversationId
]
);

return result.rows.length>0;
}


/* =========================
SEND MESSAGE
========================= */

export async function sendMessage(
req,
res
){

try{

const {

conversation_id,
content,
iv

}=req.body;


if(
!conversation_id ||
!content ||
!iv
){

return res.status(400)
.json({

error:
"conversation_id content iv required"

});

}

if(
!(await isMember(
req.user.id,
conversation_id
))
){

return res.status(403)
.json({

error:
"Not a member"

});

}

const messageId=
crypto.randomUUID();

await pool.query(
`
INSERT INTO messages
(
id,
conversation_id,
sender_id,
content,
iv,
status
)

VALUES
(
$1,
$2,
$3,
$4,
$5,
'sent'
)
`,
[
messageId,
conversation_id,
req.user.id,
content,
iv
]
);

const result=
await pool.query(
`
SELECT

m.id,
m.conversation_id,
m.sender_id,
m.content,
m.iv,
m.status,
m.created_at,

COALESCE(
u.display_name,
u.username
)

AS sender_name

FROM messages m

JOIN users u
ON u.id=m.sender_id

WHERE m.id=$1
`,
[
messageId
]
);

return res.status(201)
.json(
result.rows[0]
);

}
catch(err){

console.error(
"sendMessage:",
err
);

return res.status(500)
.json({

error:
"Server error"

});

}

}



/* =========================
GET MESSAGES
========================= */

export async function getMessages(
req,
res
){

try{

const {
conversationId
}=req.params;


if(
!(await isMember(
req.user.id,
conversationId
))
){

return res.status(403)
.json({

error:
"Not a member"

});

}

const limit=
Math.min(
parseInt(
req.query.limit
)||40,
100
);

const before=
req.query.before;

let result;

if(!before){

result=
await pool.query(

`
SELECT

m.id,
m.sender_id,
m.content,
m.iv,
m.status,
m.created_at,

COALESCE(
u.display_name,
u.username
)

AS sender_name

FROM messages m

JOIN users u
ON u.id=m.sender_id

WHERE m.conversation_id=$1

ORDER BY
m.created_at DESC

LIMIT $2
`,
[
conversationId,
limit
]

);

}else{

result=
await pool.query(

`
SELECT

m.id,
m.sender_id,
m.content,
m.iv,
m.status,
m.created_at,

COALESCE(
u.display_name,
u.username
)

AS sender_name

FROM messages m

JOIN users u
ON u.id=m.sender_id

WHERE
m.conversation_id=$1
AND
m.created_at<$2

ORDER BY
m.created_at DESC

LIMIT $3
`,
[
conversationId,
before,
limit
]

);

}

return res.json(
result.rows.reverse()
);

}
catch(err){

console.error(
"getMessages:",
err
);

return res.status(500)
.json({

error:
"Server error"

});

}

}


/* =========================
UPDATE STATUS
========================= */

export async function updateMessageStatus(
req,
res
){

try{

const {
message_id,
status
}=req.body;

if(
!VALID_STATUSES.includes(
status
)
){

return res.status(400)
.json({

error:
"Invalid status"

});

}

await pool.query(
`
UPDATE messages
SET status=$1
WHERE id=$2
`,
[
status,
message_id
]
);

res.json({
message:
"updated"
});

}
catch(err){

console.error(err);

res.status(500)
.json({
error:
"Server error"
});

}

}
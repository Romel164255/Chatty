import {
useEffect,
useRef,
useState,
useCallback
}
from "react";

import api from "../services/api";

import {
getSocket
}
from "../services/socket";

import {
decryptMessage
}
from "../utils/crypto";

import {
getChatKey
}
from "../services/keyService";


function getMyId(){

try{

return JSON.parse(
atob(
localStorage
.getItem("token")
.split(".")[1]
)
).id;

}
catch{

return null;

}

}

export default function MessageList({

conversationId

}){

const [
messages,
setMessages
]=useState([]);

const myId=
getMyId();

const bottomRef=
useRef();


async function decryptMessages(
list
){

const key=
getChatKey();

if(!key)
return list;

return Promise.all(

list.map(
async msg=>{

try{

const content=
await decryptMessage(

msg.content,
msg.iv,
key

);

return {

...msg,
content

};

}
catch{

return {

...msg,
content:
"🔒 Encrypted message"

};

}

}

)

);

}


const load=
useCallback(
async()=>{

try{

const res=
await api.get(
`/messages/${conversationId}`
);

const decrypted=
await decryptMessages(
res.data
);

setMessages(
decrypted
);

}
catch(err){

console.error(err);

}

},
[
conversationId
]
);


useEffect(()=>{

load();

},[load]);


useEffect(()=>{

const socket=
getSocket();

if(!socket)
return;

socket.emit(
"join_conversation",
conversationId
);

async function onMessage(
data
){

if(
data.conversation_id
!==conversationId
)return;


const key=
getChatKey();

try{

data.content=
await decryptMessage(

data.content,
data.iv,
key

);

}
catch{

data.content=
"🔒 Encrypted";
}

setMessages(
prev=>[
...prev,
data
]
);

}

socket.on(
"receive_message",
onMessage
);

return ()=>{

socket.off(
"receive_message",
onMessage
);

};

},[
conversationId
]);


useEffect(()=>{

bottomRef.current
?.scrollIntoView({

behavior:
"smooth"

});

},[
messages
]);


return(

<div style={s.list}>

{

messages.map(
msg=>(

<div

key={msg.id}

style={{

display:"flex",

justifyContent:

msg.sender_id===myId

?

"flex-end"

:

"flex-start"

}}

>

<div
style={{

background:

msg.sender_id===myId

?

"#005c4b"

:

"#202c33",

padding:12,

margin:6,

borderRadius:14,

maxWidth:"70%"

}}

>

<div>

{msg.content}

</div>

<div
style={{

fontSize:10,
opacity:.6

}}

>

{

new Date(
msg.created_at
)
.toLocaleTimeString()

}

</div>

</div>

</div>

)

)

}

<div ref={bottomRef}/>

</div>

);

}


const s={

list:{

flex:1,
overflowY:"auto",
padding:15,
display:"flex",
flexDirection:"column"

}

};
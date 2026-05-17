import { useState,useEffect } from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { Avatar } from "./Sidebar";
import api from "../services/api";
import { getSocket } from "../services/socket";

export default function ChatWindow({

conversationId,
title,
isGroup,
onBack

}){

const[
onlineUsers,
setOnlineUsers
]=useState([]);

const[
typingUsers,
setTypingUsers
]=useState([]);

const[
members,
setMembers
]=useState([]);

const[
showInfo,
setShowInfo
]=useState(false);


useEffect(()=>{

const s=getSocket();

if(!s)return;

const fn=(list)=>{

setOnlineUsers(list);

};

s.on(
"online_users",
fn
);

return()=>{

s.off(
"online_users",
fn
);

};

},[]);


useEffect(()=>{

const s=getSocket();

if(
!s||
!conversationId
)return;

const fn=({

conversationId:cid,
userId,
isTyping

})=>{

if(
cid!==conversationId
)return;

setTypingUsers(
prev=>

isTyping
?
[
...new Set([
...prev,
userId
])
]
:
prev.filter(
x=>x!==userId
)

);

};

s.on(
"user_typing",
fn
);

return()=>{

s.off(
"user_typing",
fn
);

};

},[
conversationId
]);


useEffect(()=>{

if(
showInfo &&
isGroup
){

api
.get(
`/groups/${conversationId}/members`
)
.then(
r=>
setMembers(
r.data
)
)
.catch(()=>{});

}

},[
showInfo,
conversationId,
isGroup
]);


if(
!conversationId
){

return(

<div className="empty-chat">

<div>

<h2>

Welcome to Cyphr

</h2>

<p>

Select a conversation

</p>

</div>

</div>

);

}


return(

<div className="chat-window">

<div className="chat-header">

<button
className="mobile-back"
onClick={onBack}
>

←

</button>

<Avatar
name={title}
size={42}
isGroup={isGroup}
/>

<div
className="chat-header-info"
>

<div>

{title}

</div>

<div
className="chat-status"
>

{

typingUsers.length>0

?

"typing..."

:

onlineUsers.length>0

?

"online"

:

"last seen recently"

}

</div>

</div>

<button

className="header-btn"

onClick={()=>
setShowInfo(
v=>!v
)
}

>

⋮

</button>

</div>

<div
className="chat-content"
>

<div
className="chat-main"
>

<MessageList
conversationId={
conversationId
}
isGroup={
isGroup
}
/>

<MessageInput
conversationId={
conversationId
}
/>

</div>

{

showInfo &&
isGroup &&

<div
className="info-panel"
>

<h4>

Members

</h4>

{

members.map(
m=>

<div
key={m.id}
className="member-row"
>

<Avatar
name={
m.username
}
size={32}
/>

<span>

{
m.username
}

</span>

</div>

)

}

</div>

}

</div>

</div>

);

}
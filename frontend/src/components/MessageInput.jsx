import { useState,useRef,useEffect,useCallback } from "react";
import EmojiPicker from "emoji-picker-react";

import api from "../services/api";
import { getSocket } from "../services/socket";

import {
encryptMessage
}
from "../utils/crypto";

const stickerPack=[

"/stickers/laugh.png",
"/stickers/wow.png",
"/stickers/heart.png",
"/stickers/thumbsup.png"

];

export default function MessageInput({

conversationId

}){

const [text,setText]=useState("");
const [sending,setSending]=useState(false);

const [showEmoji,setShowEmoji]=
useState(false);

const textareaRef=useRef();

async function sendEncrypted(content){

try{

const encrypted=
await encryptMessage(content);

const res=
await api.post(
"/messages",
{

conversation_id:
conversationId,

content:
encrypted.ciphertext,

iv:
encrypted.iv

}
);

const socket=
getSocket();

if(socket){

socket.emit(
"send_message",
res.data
);

}

window.dispatchEvent(

new CustomEvent(

"chatty:message_sent",
{

detail:res.data

}

)

);

}catch(err){

console.error(
"Encryption error:",
err
);

}

}

const send=
useCallback(async()=>{

const trimmed=
text.trim();

if(
!trimmed ||
sending
)return;

setSending(true);

setText("");

try{

await sendEncrypted(
trimmed
);

}
catch(err){

setText(trimmed);

}
finally{

setSending(false);

}

},[
text,
sending,
conversationId
]);

function handleKey(e){

if(
e.key==="Enter"
&&
!e.shiftKey
){

e.preventDefault();

send();

}

}

function addEmoji(e){

setText(

prev=>

prev+
e.emoji

);

}

async function sendSticker(url){

await sendEncrypted(url);

setShowEmoji(false);

}

return(

<>

{showEmoji && (

<div style={s.popup}>

<EmojiPicker
onEmojiClick={addEmoji}
/>

</div>

)}

<div style={s.bar}>

<textarea

ref={textareaRef}

style={s.textarea}

value={text}

placeholder=
"Encrypted message"

onChange={

e=>

setText(
e.target.value
)

}

onKeyDown=
{handleKey}

/>

<button

onClick={()=>

setShowEmoji(

!showEmoji

)

}

>

😀

</button>

<button

onClick={send}

disabled={sending}

>

➤

</button>

</div>

</>

);

}

const s={

bar:{

display:"flex",
gap:10,
padding:10

},

textarea:{

flex:1,
resize:"none"

},

popup:{

position:"absolute",
bottom:70

}

};
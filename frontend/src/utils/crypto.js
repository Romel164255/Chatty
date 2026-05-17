export async function generateAESKey() {
    return crypto.subtle.generateKey(
        {
            name:"AES-GCM",
            length:256
        },
        true,
        ["encrypt","decrypt"]
    );
}

export async function encryptMessage(message){

    const key=await generateAESKey();

    const iv=crypto.getRandomValues(
        new Uint8Array(12)
    );

    const encoded=
    new TextEncoder().encode(message);

    const encrypted=
    await crypto.subtle.encrypt(
        {
            name:"AES-GCM",
            iv
        },
        key,
        encoded
    );

    return {

        ciphertext:btoa(
            String.fromCharCode(
                ...new Uint8Array(encrypted)
            )
        ),

        iv:btoa(
            String.fromCharCode(...iv)
        ),

        key
    };
}

export async function decryptMessage(
    ciphertext,
    iv,
    key
){

    const decrypted=
    await crypto.subtle.decrypt(
        {
            name:"AES-GCM",
            iv:Uint8Array.from(
                atob(iv),
                c=>c.charCodeAt(0)
            )
        },
        key,
        Uint8Array.from(
            atob(ciphertext),
            c=>c.charCodeAt(0)
        )
    );

    return new TextDecoder()
    .decode(decrypted);
}
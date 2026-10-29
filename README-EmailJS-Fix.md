# WildFrame — EmailJS contact form fix

This ZIP contains the project source without `.env.local`, `.git`, `node_modules`, or generated `dist` files. Keep your existing `.env.local` file locally; it is not included here.

## What was fixed
- EmailJS request sends exactly the template variables `from_name`, `reply_to`, and `message`.
- The contact form now displays the actual EmailJS response/error instead of a generic message.
- Uses the Service ID, Template ID, and Public Key already provided for this project.

## EmailJS template must match
- To Email: your receiving inbox
- Reply To: `{{reply_to}}`
- HTML body variables: `{{from_name}}`, `{{reply_to}}`, `{{message}}`

## Run locally
1. Extract this ZIP.
2. Keep/restore your own `.env.local` file in the project root (do not share it).
3. Open the project folder containing `package.json` in VS Code.
4. Run `npm install`, then `npm.cmd run build`.
5. Start with `npm.cmd run dev` and submit a test contact message.

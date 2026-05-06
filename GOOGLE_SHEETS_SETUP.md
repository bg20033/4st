# Google Sheets Setup

1. Create a Google Sheet for DEVIS SUITE leads.
2. Open `Extensions > Apps Script` from that Google Sheet.
3. Replace the default code with `google-apps-script/Code.gs`.
4. Click `Run > testWrite` once and approve permissions. This should create a
   `Devis Suite Leads` tab and add one test row.
5. Deploy it as a Web app:
   - Execute as: `Me`
   - Who has access: `Anyone`
6. Copy the Web app URL ending in `/exec`.
7. Create `.env` in this project and add:

```env
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

8. Restart Vite. Vite only reads `.env` when the dev server starts.

The React form posts only these fields to the Apps Script URL:

- Service
- First Name
- Last Name
- Phone
- Email
- Canton Number
- Canton Name
- Canton Abbreviation

The script only appends rows to the `Devis Suite Leads` tab. It does not send
emails or forward the data to anyone. Opening the `/exec` URL in a browser shows
the saved rows in a simple table.

If the form does not save:

- Make sure the Apps Script came from `Extensions > Apps Script` inside the Sheet.
- Make sure the deployment URL ends with `/exec`, not `/dev`.
- After changing Apps Script code, click `Deploy > Manage deployments > Edit`
  and choose `New version`.
- After changing `.env`, restart Vite.
- If Google shows `Page Not Found` or `Sorry, unable to open the file`, the URL
  in `.env` is not a valid active Web app deployment. Create a new Web app
  deployment and replace the URL.
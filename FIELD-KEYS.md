LPR TEMPLATES — FIELD KEYS
==========================

Put these keys in a letter where a name, address, date or amount belongs.
Paste the letter into a template in Edit mode (or type the keys and click
Done): every key becomes a live field that fills in from the recipient,
tenant, sender and Fields tab. Spelling is forgiving — {{first name}},
{{First_Name}} and {{firstname}} all work. A key the templates don't
know is highlighted, never dropped.

FORMATTING CARRIES OVER
-----------------------
Format the KEY and the filled-in value gets the same formatting:
  **{{landlord}}**              -> the landlord's name in bold
  *{{date: Move-out Date}}*     -> that date in italics
  ***{{amount: Balance Due}}*** -> bold + italic
In rich text (Word, Google Docs, an AI chat's formatted answer) bold,
italic and underline all carry over. In plain text use Markdown: **bold**
and *italic* (plain text has no underline).

SAME NAME, DIFFERENT PERSON
---------------------------
Names, addresses, phones and emails exist for the recipient, a tenant and a
vendor. A key with no prefix ({{first name}}, {{city}}, {{phone}}) is the
RECIPIENT — whoever the letter is addressed to, tenant or vendor. To name a
specific one, start the key with "tenant" or "vendor": {{tenant first name}},
{{vendor phone}}. Vendor keys only work with the "vendor" prefix, and the
person signing is always {{signer …}}.

RECIPIENT — THE TENANT OR VENDOR THE LETTER IS ADDRESSED TO
-----------------------------------------------------------
  {{first name}}                 First Name
  {{last name}}                  Last Name
  {{recipient name}}             Recipient Name
  {{street address}}             Street Address
  {{address line 2}}             Address Line 2
  {{city}}                       City
  {{state}}                      State
  {{zip}}                        Zip
  {{email}}                      Email
  {{phone}}                      Phone
  {{full address}}               address on one line: 123 Main St, Apt 2, Baltimore, MD 21215 (", Apt 2" only when there is one)

TENANT ONLY
-----------
  {{lease start}}                Lease Start
  {{lease end}}                  Lease End
  {{rent amount}}                Rent Amount
  {{phone 2}}                    Phone 2 (Home/Work)
  {{email 1}}                    Email 1
  {{email 2}}                    Email 2
  {{date of birth}}              Date of Birth
  {{tenant full address}}        the tenant's address on one line: 123 Main St, Apt 2, Baltimore, MD 21215 (", Apt 2" only when there is one)

SENDER
------
  {{landlord}}                   Landlord / Company
  {{signer name}}                Signer Name
  {{signer title}}               Signer Title
  {{signer phone}}               Signer Phone
  {{signer email}}               Signer Email

VENDOR — ALWAYS STARTS WITH "VENDOR"
------------------------------------
  {{vendor name}}                Vendor Name
  {{vendor street address}}      Street Address
  {{vendor address line 2}}      Address Line 2
  {{vendor city}}                City
  {{vendor state}}               State
  {{vendor zip}}                 Zip
  {{vendor email}}               Email (Primary)
  {{vendor email alternate}}     Email (Alternate)
  {{vendor work phone}}          Work Phone
  {{vendor mobile}}              Mobile

FILL-IN BLANKS (you choose the label)
-------------------------------------
  {{date: Payment Due Date}}     a date
  {{amount: Back Rent Owed}}     a dollar amount (write the $ before it: ${{amount: …}})
  {{time: Inspection Time}}      a time
  {{text: Unit Number}}          any short text
The label is what the Fields tab asks for. The same label used twice is the
same value (fill it once, it appears everywhere).

INSTRUCTIONS FOR AN AI DRAFTING A LETTER
----------------------------------------
You are drafting the BODY of a letter for LPR Management. It will be pasted
into a letterhead template that already has the logo, our address, the date
line, the recipient's address block, the sign-off and the signature.
1. Wherever a name, address, date, amount or other blank belongs, write the
   matching {{key}} from this list instead of a value. Never invent names,
   addresses, dates or amounts.
2. For a blank that is not in the list, use a fill-in key with a clear label:
   {{date: …}}, {{amount: …}}, {{time: …}} or {{text: …}}. Reuse the exact same
   label when the same value appears again.
3. To make a filled-in value bold or italic, format the KEY itself:
   **{{rent amount}}** gives the rent in bold, *{{date: Move-out Date}}* gives
   the date in italics. Don't put the formatting inside the braces.
4. Formatting you may use: **bold**, *italic*, numbered lists (1.), bullet
   lists (-), and headings (#) for section titles. No tables, colours or fonts.
5. Start with the salutation (Dear {{first name}} {{last name}},) and end with
   the last body paragraph. Do NOT write a date line, the recipient's address,
   a closing ("Sincerely"), a signature or the sender's name — the template
   adds those.
6. Write keys exactly with double curly braces: {{first name}}.

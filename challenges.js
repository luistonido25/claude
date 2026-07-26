// Portfolio Lab - real-client challenge briefs with architecture guides
window.PORTFOLIO_CHALLENGES = [
 {
  "id": "c01",
  "title": "One Form, Three Clinics: Multi-Location Lead Router",
  "industry": "dental clinic",
  "stack": "ghl+n8n",
  "difficulty": "advanced",
  "hours": "8-12 h",
  "brief": [
   "We run three dental locations under one brand — Lakeview, Downtown, and Northgate — and one website with a single 'Request an Appointment' form. We get around 120 web leads a month, plus spikes to 200+ when we run Invisalign promos. Right now every lead lands in one shared inbox and my front desk lead spends the first 2 hours of every morning copy-pasting them into the right location's system, guessing which clinic is closest from the zip code.",
   "The part that actually costs us money: some of these people are in pain. A 'cracked tooth, please call ASAP' submission at 7pm sits until 9am the next day, and by then they've booked with whoever answered first. We estimate we lose 8-10 emergency-type leads a month that way, and an emergency visit plus follow-up treatment averages $900+ for us.",
   "Each location runs its own GoHighLevel sub-account with its own calendar, staff, and pipelines — that is not changing. What I want: the moment the form is submitted, the lead is created in the correct location's sub-account, urgent cases are flagged and texted back within a minute, and I get one simple report every morning showing yesterday's leads per location so I stop asking three office managers for numbers."
  ],
  "painPoints": [
   "~2 staff-hours every morning manually sorting and re-keying leads into three sub-accounts",
   "Emergency leads wait up to 14 hours for first contact; an estimated 8-10/month book elsewhere (~$8k+/month in lost treatment value)",
   "Leads routinely filed to the wrong location, causing reschedules and no-shows",
   "Zero owner visibility: lead counts per location are assembled by hand, days late"
  ],
  "whyStack": "GHL alone can't do this because a GHL workflow lives inside one sub-account — there is no native action to create a contact in a *different* sub-account, and no native zip-to-location routing table or AI urgency triage. n8n sits above all three sub-accounts and calls the GHL API with each location's own Private Integration token, which is exactly the cross-account glue GHL is missing. Versus Make: n8n's **Code** node makes the zip-routing table and strict-JSON AI parsing trivial to maintain, self-hosting keeps per-lead cost at zero during promo spikes (Make bills per operation, and this flow is 6-8 ops per lead), and one **Error Trigger** workflow covers failure alerting for the whole system.",
  "guide": [
   {
    "step": "Central intake webhook",
    "tool": "GHL",
    "detail": "In the brand's website sub-account, GHL workflow 'Lead -> Router': trigger **Form Submitted** (filter **Form is** 'Request an Appointment') → action **Webhook** (POST to the n8n production URL), sending `first_name`, `last_name`, `email`, `phone`, `zip`, `service_interest`, `message`, `contact_id`."
   },
   {
    "step": "Receive and normalize",
    "tool": "n8n",
    "detail": "n8n **Webhook** trigger (POST, Respond `Immediately`) → **Code** node: trim fields, extract a clean 5-digit zip with a regex, lowercase the email, and E.164-format the phone. Output one normalized JSON item per lead."
   },
   {
    "step": "Zip-based routing",
    "tool": "n8n",
    "detail": "**Switch** node with three outputs keyed on the zip prefix map defined in the preceding **Code** node (e.g. 981xx → Lakeview, 982xx → Downtown, everything else → Northgate as catch-all). Each output carries a `location_id` and the matching credential name."
   },
   {
    "step": "Create contact in the right sub-account",
    "tool": "n8n",
    "detail": "On each branch, **HTTP Request** node: POST `https://services.leadconnectorhq.com/contacts/upsert` with that location's Private Integration token (Header Auth credential), headers `Version: 2021-07-28`, body containing `locationId`, `email`, `phone`, `firstName`, `lastName`, plus custom fields `lead_source` and `service_interest`. Upsert (not create) so repeat submitters don't duplicate."
   },
   {
    "step": "AI urgency triage",
    "tool": "n8n",
    "detail": "**OpenAI** node (Message a Model) with a system prompt: classify `message` + `service_interest` into strict JSON `{\"urgency\":\"emergency|soon|routine\",\"reason\":\"...\"}` — nothing else. Follow with a **Code** node that `JSON.parse`s inside try/catch and defaults to `routine` on any parse failure, then an **IF** node on `urgency == \"emergency\"`."
   },
   {
    "step": "Tag urgent leads to fire the location workflow",
    "tool": "n8n",
    "detail": "On the emergency branch, **HTTP Request**: POST `/contacts/{contactId}/tags` in the routed sub-account adding tag `urgent-triage`, and a second **HTTP Request** to `/opportunities/` creating an opportunity in that location's 'New Patients' pipeline, stage `Emergency`, with `monetaryValue` 900."
   },
   {
    "step": "Instant text-back per location",
    "tool": "GHL",
    "detail": "In EACH location sub-account, workflow 'Urgent Triage': trigger **Contact Tag** (tag `urgent-triage` added) → **Send SMS** ('We saw your message about {{contact.custom_field.service_interest}} — call us now at ...') → **Internal Notification** to the on-call front desk. A parallel workflow on tag `routine-lead` sends the standard booking-link SMS."
   },
   {
    "step": "Log every routed lead",
    "tool": "n8n",
    "detail": "After the upsert, **Google Sheets** node (Append Row) into sheet 'Router Log' with `Timestamp`, `Location`, `Name`, `Email`, `Zip`, `Urgency`, `GHL Contact ID`. This is the audit trail and the report source."
   },
   {
    "step": "Daily 7am owner report",
    "tool": "n8n",
    "detail": "Second workflow: **Schedule Trigger** (07:00 clinic-local time) → **Google Sheets** (Get Rows, filtered to yesterday) → **Code** node aggregates counts per location and per urgency → **Gmail** node sends an HTML table to the owner; optional **Telegram** copy to the ops group."
   },
   {
    "step": "Error safety net",
    "tool": "n8n",
    "detail": "Separate workflow with **Error Trigger** → **Telegram** message containing workflow name, failed node, and the lead's email, so a failed API call never means a silently lost patient. Set the router workflow's error workflow setting to point at it."
   },
   {
    "step": "Cutover and end-to-end test",
    "tool": "Test",
    "detail": "Build against the n8n **Test URL** (`/webhook-test/`), then switch the GHL **Webhook** action to the **Production URL**. Submit three test leads with zips for each location plus one 'severe pain' message; verify correct sub-account, `urgent-triage` tag, SMS within 60 seconds, and the sheet row."
   }
  ],
  "dataModel": [
   "GHL custom fields (each location sub-account): `service_interest` (dropdown: Cleaning, Invisalign, Emergency, Other), `lead_source` (text), `triage_reason` (text)",
   "GHL pipeline per location: 'New Patients' with stages New → Emergency → Contacted → Booked → Showed",
   "Google Sheet 'Router Log': Timestamp | Location | Name | Email | Phone | Zip | Urgency | GHL Contact ID",
   "n8n credentials: three Header Auth credentials (one Private Integration token per sub-account), OpenAI key, Google Sheets OAuth, Telegram bot"
  ],
  "edgeCases": [
   "Dedupe: same patient submits twice or from two devices — upsert on email+phone, and check the Router Log before double-texting",
   "Zip not in the map or PO-box zip: route to catch-all location AND flag the row so the map gets updated, never drop the lead",
   "GHL API rate limits (burst 100 requests / 10 s per location): a promo blast is fine at this volume, but batch the tag+opportunity calls rather than firing 6 calls per lead",
   "A2P 10DLC: each location's SMS number must have an approved registration before the instant text-back goes live, or carriers will filter it",
   "n8n test vs production URL: the `/webhook-test/` URL only listens while the editor is open — the GHL workflow must point at the production URL before sign-off"
  ],
  "acceptance": [
   "10 test submissions across all three zip zones each land in the correct sub-account within 60 seconds, zero manual touches",
   "A submission containing 'broken tooth, in pain' gets the `urgent-triage` tag and an SMS reply in under 1 minute",
   "A duplicate submission (same email) updates the existing contact instead of creating a second one",
   "The 7am report email arrives with per-location counts that match the Router Log exactly",
   "Killing the OpenAI credential mid-test produces a Telegram error alert and the lead still lands in GHL as `routine` (graceful degradation)"
  ],
  "portfolio": [
   "Loom (5-7 min): submit the form on camera, show the n8n execution light up, jump into the correct sub-account to show the contact + tag, show the SMS arriving on a real phone, end on the morning report email",
   "Case-study angle: 'cross-sub-account routing GHL can't do natively' — lead with the 2-hours-every-morning number and the emergency-lead response time going from 14 hours to under 1 minute",
   "Frame it honestly as a demonstration build with fictional clinic data — the architecture diagram (form → GHL webhook → n8n switch → 3 sub-accounts) is the hero image",
   "Include a screenshot of the **Error Trigger** workflow — reliability engineering is what separates you from template-flippers"
  ],
  "stretch": [
   "Replace the zip map with a Google Maps Distance Matrix call in an **HTTP Request** node and route to the truly nearest clinic",
   "Push urgent leads straight into the location's GHL calendar via the appointments API instead of just texting a link",
   "Add a weekly trend report comparing lead volume and emergency ratio per location month-over-month"
  ]
 },
 {
  "id": "c02",
  "title": "Failed-Payment Rescue Engine for a 900-Member Gym",
  "industry": "gym",
  "stack": "ghl+n8n",
  "difficulty": "advanced",
  "hours": "8-12 h",
  "brief": [
   "I own a strength gym with about 900 active members on monthly Stripe subscriptions, $89-$159/month. Every month roughly 40-60 payments fail — expired cards, insufficient funds, the usual. Stripe retries on its own schedule, but nobody talks to the member, so a fixable card problem quietly turns into a cancellation. Our books show involuntary churn costing us roughly $4,000-$5,500 in MRR every month.",
   "My ops manager currently exports a Stripe report on Fridays and texts people by hand from her personal phone. It's inconsistent, there's no record of who was contacted, and by Friday half of these members have already been locked out by the front-door system and are angry. She spends 3-4 hours a week on this and hates every minute.",
   "I want a machine: the second a payment fails, the member gets a friendly, escalating sequence — email first, SMS a day later, then a personal task for staff — with a self-serve card-update link. Every failure and every save gets logged so I can see a weekly save-rate number. When someone does hit the cancel wall, I want them dropped into a cancel-save pipeline my manager works from, not a spreadsheet."
  ],
  "painPoints": [
   "$4,000-$5,500 MRR lost monthly to involuntary churn that is mostly just expired cards",
   "3-4 staff-hours/week on manual Stripe exports and personal-phone texting, with no contact log",
   "Members find out via door lockout, not a friendly message — brand damage on top of churn",
   "No save-rate metric: the owner cannot tell if any recovery effort actually works"
  ],
  "whyStack": "GHL has no Stripe *failed-payment* trigger for subscriptions charged outside GHL, and no place to keep a per-invoice attempt ledger with retry counts — its workflows are stateless per contact. n8n owns the stateful part: a **Stripe Trigger** catches `invoice.payment_failed` in real time, a ledger sheet tracks attempt numbers per invoice, and a **Switch** escalates accordingly; GHL then does what it is genuinely best at — tag-triggered SMS/email sequences, the cancel-save pipeline, and staff tasks. Make could catch the webhook too, but the attempt-ledger logic and Stripe signature handling are cleaner in n8n's **Code** node, and a 24/7 listener that fires 60+ times a month with multi-step branches is cheaper self-hosted than per-operation billing.",
  "guide": [
   {
    "step": "Catch the failure in real time",
    "tool": "n8n",
    "detail": "**Stripe Trigger** node subscribed to `invoice.payment_failed` and `invoice.payment_succeeded` (n8n registers the webhook endpoint on activation). Alternative shown in docs: raw **Webhook** node + **Code** verifying the `Stripe-Signature` header — mention it, use the trigger node."
   },
   {
    "step": "Ledger write and attempt count",
    "tool": "n8n",
    "detail": "**Google Sheets** (Get Rows) on 'Dunning Ledger' filtered by `invoice_id` → **Code** node computes `attempt = existing ? existing.attempt + 1 : 1` and the amount at risk → **Google Sheets** (Append or Update Row, key `invoice_id`) writing `attempt`, `amount`, `status = failing`, `last_failed_at`."
   },
   {
    "step": "Find or create the member in GHL",
    "tool": "n8n",
    "detail": "**HTTP Request**: POST `https://services.leadconnectorhq.com/contacts/upsert` (Private Integration token, `Version: 2021-07-28`) keyed on the Stripe customer email, setting custom fields `stripe_customer_id`, `failed_amount`, `card_update_url` (the Stripe-hosted invoice payment link from the event payload)."
   },
   {
    "step": "Escalate by attempt number",
    "tool": "n8n",
    "detail": "**Switch** on `attempt`: 1 → **HTTP Request** adds tag `dunning-1`; 2 → tag `dunning-2`; 3+ → tag `dunning-3` AND **HTTP Request** POST `/opportunities/` into the 'Cancel-Save' pipeline stage `At Risk` with `monetaryValue` = 12x the monthly plan."
   },
   {
    "step": "Escalating comms",
    "tool": "GHL",
    "detail": "Three GHL workflows: trigger **Contact Tag** `dunning-1` → **Send Email** (friendly 'card hiccup' + `{{contact.custom_field.card_update_url}}`); `dunning-2` → **Wait** 20 h → **Send SMS** with the same link; `dunning-3` → **Send SMS** ('we'd hate to lose you') + **Add Task** assigned to the ops manager to call within 24 h. Each workflow starts by removing the previous dunning tag."
   },
   {
    "step": "Detect the save",
    "tool": "n8n",
    "detail": "The `invoice.payment_succeeded` branch of the **Stripe Trigger** → **Google Sheets** (Append or Update Row) sets `status = saved` → **HTTP Request** removes all `dunning-*` tags and adds `payment-recovered`, which a GHL workflow (trigger **Contact Tag** `payment-recovered`) answers with a 'you're all set' SMS and closes any open Cancel-Save opportunity as won via **HTTP Request** back from n8n."
   },
   {
    "step": "Stop-the-presses cancel handling",
    "tool": "n8n",
    "detail": "Add `customer.subscription.deleted` to the **Stripe Trigger** events: mark ledger `status = churned`, move the GHL opportunity to stage `Lost` via **HTTP Request**, add tag `winback-pool` so the member enters the 60-day winback nurture instead of vanishing."
   },
   {
    "step": "Weekly save-rate report",
    "tool": "n8n",
    "detail": "**Schedule Trigger** (Mondays 07:00 gym-local) → **Google Sheets** (Get Rows, last 7 and last 30 days) → **Code** computes failures, saves, churns, save-rate %, and MRR recovered → **Gmail** to the owner + **Slack** message to #ops with the one-line headline number."
   },
   {
    "step": "Error workflow",
    "tool": "n8n",
    "detail": "**Error Trigger** → **Slack** alert with the invoice id and failing node. A missed dunning event is real money, so also enable the main workflow's built-in retry (Settings → retry on fail) for the GHL **HTTP Request** nodes."
   },
   {
    "step": "End-to-end test with Stripe test clocks",
    "tool": "Test",
    "detail": "In Stripe test mode, use the CLI (`stripe trigger invoice.payment_failed`) three times for one customer and watch the **Stripe Trigger** fire each time: verify ledger attempts 1→2→3, tags progressing, SMS/email firing, opportunity created at attempt 3 — then fire `invoice.payment_succeeded` and confirm the save path and the Monday report numbers."
   }
  ],
  "dataModel": [
   "GHL custom fields: `stripe_customer_id` (text), `failed_amount` (number), `card_update_url` (text), `plan_name` (text)",
   "GHL pipeline 'Cancel-Save': At Risk → Contacted → Saved → Lost",
   "GHL tags: `dunning-1`, `dunning-2`, `dunning-3`, `payment-recovered`, `winback-pool`",
   "Google Sheet 'Dunning Ledger': invoice_id | stripe_customer_id | email | amount | attempt | status (failing/saved/churned) | first_failed_at | last_event_at",
   "n8n credentials: Stripe API key (webhook auto-registered), GHL Private Integration token, Google Sheets OAuth, Slack/Gmail"
  ],
  "edgeCases": [
   "Stripe sends webhooks at-least-once: dedupe on the Stripe `event.id` (store it in the ledger row) so a redelivery never double-texts a member",
   "Distinguish Stripe's own smart retries from your ledger attempts — key on `invoice_id`, not on event count, and read `next_payment_attempt` before scheduling comms",
   "A2P 10DLC must be approved on the GHL number before dunning SMS goes live; billing-related SMS templates should avoid link-shortener domains carriers flag",
   "Quiet hours: gate the **Send SMS** steps in GHL to 9am-8pm member-local time; a 3am 'your card failed' text creates the churn it was meant to prevent",
   "Member pays cash in person while `dunning-2` is pending: staff needs a manual `payment-recovered` tag path that also updates the ledger (small n8n **Webhook** the front desk can hit)"
  ],
  "acceptance": [
   "A simulated failed payment produces the dunning-1 email within 2 minutes, with a working card-update link",
   "Three consecutive failures on one invoice escalate 1→2→3 with no duplicate messages, and attempt 3 creates a Cancel-Save opportunity with the correct 12-month value",
   "A recovery event stops all pending dunning steps and sends the confirmation SMS",
   "Replaying the same Stripe event twice (redelivery test) produces exactly one ledger row and one message",
   "The Monday report shows failures, saves, churns, save-rate %, and recovered MRR, and the numbers reconcile against the ledger",
   "Owner can trace any member's full dunning history from the ledger in under 30 seconds"
  ],
  "portfolio": [
   "Loom: fire a Stripe CLI test event on camera, follow it through the n8n execution, show the tag appearing in GHL and the SMS on a phone, then fire the success event and show the save — end on the weekly report",
   "Case-study angle: involuntary churn is the easiest revenue a gym can recover — frame around 'save rate' as the single metric, e.g. 'industry benchmarks say 30-50% of failed payments are recoverable with prompt outreach'",
   "Be explicit that this is a demonstration build on Stripe test mode with fictional members — never imply a real gym's revenue numbers",
   "Show the redelivery/dedupe test in the Loom; handling webhook replays correctly is the senior-level detail reviewers notice"
  ],
  "stretch": [
   "Add a pre-dunning step: **Schedule Trigger** monthly scan of `card_expiring_soon` from Stripe and a heads-up SMS before anything fails",
   "Route Cancel-Save opportunities round-robin to two staff members via n8n instead of always tasking the ops manager",
   "Push save-rate history into a small chart in the weekly email using a **Code**-generated inline SVG"
  ]
 },
 {
  "id": "c03",
  "title": "Portal Lead Concierge: From Zillow Email to Booked Showing",
  "industry": "real estate",
  "stack": "ghl+n8n",
  "difficulty": "advanced",
  "hours": "8-12 h",
  "brief": [
   "I lead a four-agent residential team. We pay for placement on two listing portals and together they send us 150-180 inquiry emails a month — 'John D. is interested in 4512 Maple Ave, $615,000, phone (555) 210-9931'. They arrive as notification emails to a shared inbox. Whoever checks the inbox first copies the details into our GoHighLevel, usually hours later. The portals' own stats say leads contacted within 5 minutes are many times more likely to convert; our median response time is 3 hours 40 minutes.",
   "Worse, the emails are half-structured: name, phone, property address, sometimes a price range and a free-text message like 'pre-approved, relocating in June, cash possible'. That message is gold — it tells you who's a real buyer — and today it dies in the inbox. My agents chase everyone equally, which means the two genuinely hot buyers a week get the same attention as the tire-kickers.",
   "What I want: every portal email parsed automatically the minute it lands, a contact and opportunity in GHL, an instant text-back to the buyer with a link to book a showing on the listing agent's calendar, and an AI read on how hot the buyer is so my agents' morning starts with a ranked list, not an inbox."
  ],
  "painPoints": [
   "Median first response 3h 40m vs the sub-5-minute window where portal leads actually convert",
   "150-180 leads/month re-typed by hand from emails — roughly 12 staff-hours/month of pure data entry",
   "Buyer-intent signals in the free-text message ('pre-approved', 'cash', timeline) are read once and lost",
   "No prioritization: hot buyers and tire-kickers get identical, slow treatment"
  ],
  "whyStack": "The lead source here is an *email*, and GHL cannot trigger a workflow from parsing an arbitrary inbound notification email — there's no native email-scraping trigger, no regex, and no LLM step. n8n's **Gmail Trigger** plus a **Code** parser (with an AI fallback for layout changes) converts the email into clean fields, and its **OpenAI** node produces the hot-buyer score GHL has no way to compute. GHL then runs the parts it dominates: instant SMS, calendars per agent, and the pipeline. Make has email parsing too, but n8n wins on the messy part — portals change their email templates without warning, and a **Code** node with layered regexes plus an LLM fallback branch is far easier to patch than a chain of visual text-parser modules; self-hosting also means 180 multi-step parses a month cost nothing.",
  "guide": [
   {
    "step": "Watch the portal inbox",
    "tool": "n8n",
    "detail": "**Gmail Trigger** (poll every minute) filtered to label `Portal-Leads` (a Gmail filter routes both portals' sender addresses into that label). Immediately after processing, a **Gmail** node (Add Label `Processed` / Remove `Portal-Leads`) so a re-poll can never double-handle a message."
   },
   {
    "step": "Deterministic parse first",
    "tool": "n8n",
    "detail": "**Code** node with per-portal regexes keyed on the sender domain: extract `buyer_name`, `phone`, `email`, `property_address`, `list_price`, `message`. Output a `parse_ok` boolean. Keep the regexes in one object at the top of the node so template changes are a one-line fix."
   },
   {
    "step": "AI fallback parse",
    "tool": "n8n",
    "detail": "**IF** `parse_ok == false` → **OpenAI** node (Message a Model): 'Extract from this email strict JSON {buyer_name, phone, email, property_address, list_price, message} — null for anything absent.' → **Code** try/catch `JSON.parse`; if even this fails, **Gmail** forwards the raw email to the team lead flagged `PARSE FAILED` and the run stops gracefully."
   },
   {
    "step": "Hot-buyer scoring",
    "tool": "n8n",
    "detail": "**OpenAI** node scoring the free-text `message` + `list_price`: strict JSON `{\"score\": 1-10, \"signals\": [\"pre-approved\",\"cash\",...], \"summary\": \"one sentence\"}`. Pre-approval, cash, concrete timeline, and repeat inquiries push the score up; validate with the same try/catch pattern, default score 5."
   },
   {
    "step": "Create contact + opportunity",
    "tool": "n8n",
    "detail": "**HTTP Request** POST `https://services.leadconnectorhq.com/contacts/upsert` (Private Integration token, `Version: 2021-07-28`) with custom fields `property_address`, `list_price`, `buyer_score`, `buyer_signals`, `portal_source` → second **HTTP Request** POST `/opportunities/` into pipeline 'Portal Buyers', stage `New Inquiry`, name '`buyer_name` – `property_address`', `monetaryValue` = expected commission → third call adds tag `portal-lead` (and `hot-buyer` when score ≥ 8)."
   },
   {
    "step": "Route to the listing agent",
    "tool": "n8n",
    "detail": "**Google Sheets** (Get Rows) on 'Listing Roster' mapping `property_address` → agent, calendar id, and GHL user id → **Code** matches the address (normalized, fuzzy contains) → the upsert above sets `assigned_agent`; unmatched addresses fall to the round-robin default agent and flag the row."
   },
   {
    "step": "Instant text-back with booking link",
    "tool": "GHL",
    "detail": "GHL workflow 'Portal Instant Reply': trigger **Contact Tag** (`portal-lead` added) → **Send SMS** within the same minute: 'Hi {{contact.first_name}}, thanks for asking about {{contact.custom_field.property_address}} — pick a showing time here: <calendar link>' → **Wait** 30 min → **If/Else** on no reply → one polite nudge SMS. Calendar is the assigned agent's GHL calendar."
   },
   {
    "step": "Hot-buyer red phone",
    "tool": "n8n",
    "detail": "**IF** `score >= 8` → **Telegram** message to the team group: name, property, score, signals, and a tel: link — the rule is a human calls a hot buyer inside 5 minutes; the SMS already went out as a safety net."
   },
   {
    "step": "Showing booked / stale handling",
    "tool": "GHL",
    "detail": "Workflow trigger **Customer Booked Appointment** (showing calendars) → move opportunity to stage `Showing Booked` + **Send SMS** confirmation with address and agent name. A second workflow: trigger **Stale Opportunity** (3 days in `New Inquiry`) → re-engage SMS with two alternative time slots."
   },
   {
    "step": "Test the whole chain",
    "tool": "Test",
    "detail": "Forward 5 saved real portal emails (details fictionalized) into the labeled inbox: verify parse, score, contact, opportunity, agent match, SMS arrival time, and that one deliberately mangled email hits the AI fallback and one unparseable email lands in the team lead's inbox flagged — then confirm the **Gmail Trigger** label swap prevents reprocessing."
   }
  ],
  "dataModel": [
   "GHL custom fields: `property_address` (text), `list_price` (number), `buyer_score` (number), `buyer_signals` (text), `portal_source` (dropdown: PortalA, PortalB), `assigned_agent` (text)",
   "GHL pipeline 'Portal Buyers': New Inquiry → Contacted → Showing Booked → Offer → Closed/Lost",
   "GHL calendars: one showing calendar per agent",
   "Google Sheet 'Listing Roster': property_address | mls_id | agent_name | ghl_user_id | calendar_id | status",
   "Gmail labels: `Portal-Leads` (filter target), `Processed`, plus n8n credentials for Gmail OAuth, GHL token, OpenAI, Telegram"
  ],
  "edgeCases": [
   "Portal template changes: the deterministic parse will silently break — that's why `parse_ok` routes to the AI fallback and why a weekly **Schedule Trigger** should compare parse-failure rate and alert if it jumps",
   "Duplicate inquiries: the same buyer asking about three listings must upsert to ONE contact but create three opportunities — key contacts on email/phone, opportunities on contact+address",
   "Gmail polling is at-least-once in practice: the label-swap (Remove `Portal-Leads`, Add `Processed`) inside the same execution is the idempotency lock",
   "A2P 10DLC + quiet hours: portal leads arrive at 11pm; the instant SMS should still go out (buyers expect it) but the nudge and agent-call escalation must respect 8am-9pm buyer-local time",
   "TCPA note for the client: portal inquiries are inbound requests, but keep the SMS strictly about the property they asked about and include opt-out language"
  ],
  "acceptance": [
   "A portal email landing in the inbox produces a GHL contact, opportunity, and buyer SMS in under 2 minutes, measured on camera",
   "Median first-response time (SMS timestamp minus email timestamp) under 2 minutes across a 10-email test batch",
   "A 'pre-approved, cash, moving in 30 days' message scores ≥ 8 and fires the Telegram alert; a 'just curious about the area' message scores ≤ 4 and does not",
   "The same buyer emailing about two properties yields one contact with two opportunities, and each SMS references the correct address",
   "A deliberately garbled email ends up flagged in the team lead's inbox rather than creating a junk contact",
   "Agents confirm the morning pipeline view is sorted by `buyer_score` and matches reality for a week"
  ],
  "portfolio": [
   "Loom: send a fictional portal email live, show the n8n execution parse → score → GHL calls, the SMS arriving, and the hot-buyer Telegram ping — close on the pipeline sorted by score",
   "Case-study angle: 'speed-to-lead' — the 3h40m → under 2 minutes number is the whole story; cite the well-known portal statistic about 5-minute response windows without inventing client results",
   "State plainly it's a demonstration build using fictionalized portal emails — actually a trust point, since real portal emails contain consumer PII you should not be showing anyway",
   "Include the two-layer parsing diagram (regex first, LLM fallback, human dead-letter) — resilience to template drift is the senior detail"
  ],
  "stretch": [
   "Enrich with a property-details lookup (**HTTP Request** to an MLS/listing API) so the SMS can mention beds/baths",
   "Add missed-call text-back on the office line and merge those leads into the same pipeline",
   "Log every lead + score to a sheet and ship a monthly conversion-by-score-band report proving the model's calibration"
  ]
 },
 {
  "id": "c04",
  "title": "Client-Reporting Factory: 22 Sub-Accounts, One Button (Actually Zero Buttons)",
  "industry": "marketing agency",
  "stack": "ghl+n8n",
  "difficulty": "advanced",
  "hours": "10-14 h",
  "brief": [
   "We're a marketing agency running 22 client sub-accounts under one GoHighLevel agency account — local service businesses, mostly. Every month my account manager spends the first three business days building client reports: logging into each sub-account, screenshotting dashboards, pasting numbers into a Google Docs template, exporting PDFs, writing 22 emails. Call it 20-24 hours of skilled labor a month producing something clients skim for 90 seconds.",
   "It's also error-prone. Twice this year a client got last month's numbers, and once a client got *another client's* report. That second one nearly cost us the account. And because reports ship on the 3rd-5th, clients who are anxious about results have already emailed us asking 'how did last month do?' before the report exists.",
   "I want reports to build themselves on the 1st of every month before anyone wakes up: pull each client's numbers from the GHL API — new leads, appointments booked, pipeline value moved, review count — drop them into our branded Google Docs template, render a PDF, email it to the client from our domain, and post a one-line summary per client in our #client-reports Slack channel. And when we sign client #23, onboarding them into reporting should be adding ONE row to a config sheet. Nothing else."
  ],
  "painPoints": [
   "20-24 hours/month of account-manager time on copy-paste reporting (~$700-900/month at loaded cost)",
   "Manual errors: wrong month's numbers twice this year, one cross-client report leak that nearly lost an account",
   "Reports land days late, generating 'how did we do?' support emails instead of preventing them",
   "Adding a client means an undocumented 45-minute manual reporting setup someone always forgets a step of"
  ],
  "whyStack": "GHL's native email reports are per-sub-account, cosmetically rigid, and can't merge API metrics into a branded Google Doc, render a PDF, or fan out across 22 sub-accounts from one place — there is simply no native cross-account report builder. n8n is the only piece here that can loop a config sheet, mint per-location API calls, drive the Google Docs/Drive template pipeline, and deliver via Gmail and Slack in one run. Against Make: this is a 22-client × ~15-operation monthly batch with pagination inside it — n8n's **Loop Over Items** with a **Code** aggregation step handles per-client isolation (one client failing must not kill the other 21, via per-branch error handling) more controllably, and there's no per-operation bill creeping up as the roster grows.",
  "guide": [
   {
    "step": "Config sheet is the onboarding surface",
    "tool": "Setup",
    "detail": "Create Google Sheet **Reporting Config**, one row per client: `client_name`, `location_id`, `report_email`, `cc_email`, `slack_channel`, `template_doc_id`, `active`. Signing client #23 = adding one row with `active = TRUE`. The n8n **Google Sheets** nodes read everything else from here."
   },
   {
    "step": "Monthly kickoff",
    "tool": "n8n",
    "detail": "**Schedule Trigger** (1st of month, 05:00 agency-local) → **Google Sheets** (Get Rows, filter `active = TRUE`) → **Code** computes last month's date window in the agency timezone (`start`, `end` ISO strings) and stamps it onto every client item → **Loop Over Items** (Split In Batches, size 1) so each client processes in isolation."
   },
   {
    "step": "Pull the numbers per client",
    "tool": "n8n",
    "detail": "Inside the loop, parallel **HTTP Request** nodes against `https://services.leadconnectorhq.com` with the agency Private Integration token and `Version: 2021-07-28`: `/contacts/` (created in window, paginated) for new leads; `/calendars/events` for appointments in window; `/opportunities/search` for pipeline value moved and won revenue — each passing the row's `location_id`. A **Code** node follows each to walk pagination cursors and reduce to totals."
   },
   {
    "step": "Aggregate and sanity-check",
    "tool": "n8n",
    "detail": "**Merge** node combines the three metric streams → **Code** assembles the report object (leads, appts, show rate, pipeline value, won revenue, reviews) and computes deltas vs the previous month stored in the 'Report History' sheet. **IF** any metric is null/absurd (e.g. leads = 0 for a client averaging 80) → **Slack** warning to #ops and skip send for that client only — never email a suspicious report."
   },
   {
    "step": "Fill the branded template",
    "tool": "n8n",
    "detail": "**Google Drive** node (Copy File) duplicates the client's `template_doc_id` into the 'Reports/{{year-month}}' folder, named '{{client_name}} – {{Month YYYY}}' → **Google Docs** node (Update Document) runs replaceAll on placeholders `{{client_name}}`, `{{period}}`, `{{new_leads}}`, `{{appointments}}`, `{{pipeline_value}}`, `{{won_revenue}}`, `{{delta_leads}}` etc."
   },
   {
    "step": "Render the PDF",
    "tool": "n8n",
    "detail": "**HTTP Request** (GET, Google OAuth2 credential) to the Drive export endpoint `https://www.googleapis.com/drive/v3/files/{{docId}}/export?mimeType=application/pdf`, response format `File` — the binary PDF now rides the item."
   },
   {
    "step": "Deliver: email + Slack",
    "tool": "n8n",
    "detail": "**Gmail** node (Send, from the agency reporting alias) to `report_email` cc `cc_email`, subject '{{client_name}} — {{Month}} performance report', short body, PDF attached → **Slack** node posts to `slack_channel`: '{{client_name}}: {{new_leads}} leads ({{delta_leads}}%), {{appointments}} appts, ${{won_revenue}} won — PDF sent ✅' → **Google Sheets** (Append Row) to 'Report History' with all metrics + doc link + sent timestamp."
   },
   {
    "step": "Per-client failure isolation",
    "tool": "n8n",
    "detail": "Set the loop-interior **HTTP Request** nodes to 'Continue (using error output)' and route the error output to a **Slack** alert naming the client and node, then back to the **Loop Over Items** input — one client's expired calendar or bad `location_id` produces an alert, not 21 missing reports. A global **Error Trigger** workflow catches anything structural."
   },
   {
    "step": "GHL-side hygiene",
    "tool": "GHL",
    "detail": "In the agency account, create the **Private Integration** with only the scopes needed (contacts.readonly, calendars.readonly, opportunities.readonly) and store its token as the n8n **Header Auth** credential. Standardize every sub-account on the same pipeline naming ('Main Pipeline') so `/opportunities/search` queries are uniform — document this as the one onboarding prerequisite per client."
   },
   {
    "step": "Dry-run mode, then go live",
    "tool": "Test",
    "detail": "Add a `dry_run` flag read from the config sheet header: when TRUE, **IF** node reroutes all 22 emails to the agency's own inbox. Run a full dry run against real sub-accounts, have the AM spot-check 5 PDFs against the dashboards, fix discrepancies, flip `dry_run`, and let the 1st-of-month run ship for real with the AM watching #client-reports."
   }
  ],
  "dataModel": [
   "Google Sheet 'Reporting Config': client_name | location_id | report_email | cc_email | slack_channel | template_doc_id | active",
   "Google Sheet 'Report History': run_month | client_name | new_leads | appointments | show_rate | pipeline_value | won_revenue | reviews | doc_link | sent_at | status",
   "Google Drive: 'Report Templates' folder (one branded Doc per client or one shared master), 'Reports/{{YYYY-MM}}' output folders",
   "GHL: agency-level Private Integration token (read-only scopes); standardized pipeline + stage names across sub-accounts",
   "n8n credentials: GHL Header Auth, Google Drive/Docs/Sheets OAuth, Gmail alias, Slack bot"
  ],
  "edgeCases": [
   "GHL API pagination and rate limits: 22 clients × several paginated endpoints approaches the burst limit (100 req/10 s) — batch size 1 with a short **Wait** between clients keeps the run polite",
   "Cross-client leakage is the cardinal sin here: the copy-fill-export-send chain must all reference the SAME loop item; assert `client_name` appears in the rendered doc title before sending (a **Code** guard), because that exact bug already burned this client once",
   "Timezone and month boundaries: 'last month' must be computed in the agency's timezone, not UTC, or the 1st-of-month run double-counts/misses edge-day records",
   "Clients with mid-month start dates: first report covers a partial month — label it 'partial period' in the template rather than showing scary low numbers",
   "Google Docs API quotas: 22 copy+update+export cycles is fine, but add retry-on-fail to the **Google Docs** node since transient 429s are common at 5am batch windows"
  ],
  "acceptance": [
   "On a scheduled run, all active clients receive a correct branded PDF before 7am on the 1st with zero human touches",
   "Every PDF's numbers match a manual spot-check of that sub-account's dashboard for the same window (AM verifies 5 random clients)",
   "A deliberately broken `location_id` in one config row produces a Slack alert for that client while the other clients' reports still ship",
   "Adding a brand-new test client row to the config sheet — and doing nothing else — includes them in the next run",
   "No report ever contains another client's name or numbers (verified by the automated name-guard plus manual review of the first live batch)",
   "#client-reports shows one summary line per client, and 'how did last month do?' inbound emails drop measurably in month two"
  ],
  "portfolio": [
   "Loom: start from the config sheet, trigger the workflow manually, follow one client through copy → fill → PDF → inbox, then show the Slack channel filling up — end by adding a config row and re-running to prove one-row onboarding",
   "Case-study angle: '3 days of copy-paste to zero' — lead with the 20-24 hours/month figure and the near-miss cross-client incident as the risk story",
   "Demonstration-build framing: fictional client names and seeded sub-account data; say so explicitly, and note the architecture is what an agency buys, not the fake numbers",
   "Show the failure-isolation test in the Loom (break one client, others survive) — that's the difference between a demo and a system an agency trusts monthly revenue reporting to"
  ],
  "stretch": [
   "Add an AI executive-summary paragraph per report: **OpenAI** node turns the metric deltas into 3 plain-English sentences the AM can edit before send (switch to a review-then-send Slack approval step)",
   "Quarterly rollup report per client reusing Report History",
   "Client-facing live dashboard: push the same metrics to a simple hosted page instead of only a monthly PDF"
  ]
 },
 {
  "id": "c05",
  "title": "Dispatch Board + Review Chain for a 6-Truck HVAC Shop",
  "industry": "HVAC services",
  "stack": "ghl+n8n",
  "difficulty": "intermediate",
  "hours": "6-10 h",
  "brief": [
   "I run an HVAC company with six trucks doing 25-35 jobs a week — installs, repairs, maintenance tune-ups. Customers book through our GoHighLevel calendar or by phone (the office books those into the same calendar). From there it's chaos: my dispatcher keeps a paper-ish spreadsheet she retypes from the calendar every morning, techs get their jobs by text from her personal phone, and when a job wraps up, the invoice goes out 'when someone gets to it' — sometimes three days later.",
   "Reviews are the other leak. We do good work — but we ask for reviews maybe one time in ten, always late. My biggest competitor has 4x our Google review count with worse service. And no-shows/reschedules are handled by memory: last month two techs drove 40 minutes to a customer who had rescheduled in the calendar two days earlier.",
   "What I want: every booking automatically appears on a live dispatch board my dispatcher owns, the assigned tech gets a Telegram message with the job details and address, marking a job complete fires the invoice within minutes and starts a polite review-request sequence, and reschedules/no-shows update the board and notify the tech so nobody drives to a dead appointment again."
  ],
  "painPoints": [
   "Dispatcher retypes the calendar into a spreadsheet every morning (~45 min/day) and dispatches from a personal phone",
   "Invoices lag jobs by 1-3 days, stretching cash flow on ~30 jobs/week",
   "Review requests happen ~10% of the time; competitor has 4x the Google reviews",
   "Two wasted 40-minute truck rolls last month from unseen reschedules — fuel, labor, and an angry customer"
  ],
  "whyStack": "GHL handles booking, invoicing, and review-request messaging natively — but it has no dispatch board concept, no Telegram integration, and no way to maintain an external live job sheet keyed to appointment lifecycle events. n8n bridges those: it mirrors every appointment event into a Sheets dispatch board, fans out Telegram to techs (GHL can't message Telegram at all), and turns a tech's job-complete ping into an invoice API call plus a review tag. Make could wire this too, but the job-complete **Webhook** endpoint techs hit from the field, the row-update logic on reschedules, and running it all flat-cost on a self-hosted instance make n8n the better fit for a shop that will keep bolting on steps.",
  "guide": [
   {
    "step": "Booking event out of GHL",
    "tool": "GHL",
    "detail": "GHL workflow 'Job → Dispatch': trigger **Customer Booked Appointment** (all service calendars) → action **Webhook** (POST to n8n production URL) sending `appointment_id`, `calendar_name`, `start_time`, `contact_id`, `full_name`, `phone`, `address`, `service_type` (custom field), `assigned_user`."
   },
   {
    "step": "Write the dispatch board row",
    "tool": "n8n",
    "detail": "n8n **Webhook** trigger → **Code** normalizes the payload and derives `job_id` from `appointment_id` → **Google Sheets** (Append or Update Row, key `job_id`) on 'Dispatch Board' with columns Status=`Scheduled`, tech, time window, address, service type, phone. Append-or-update means a re-fired webhook can't duplicate rows."
   },
   {
    "step": "Tech lookup and Telegram dispatch",
    "tool": "n8n",
    "detail": "**Google Sheets** (Get Rows) on 'Tech Roster' maps `assigned_user` → `telegram_chat_id` → **Telegram** node (Send Message) to that tech: date/time, customer name, address as a tappable Google Maps link, service type, and the job-complete link (next step). Fallback **IF** no roster match → message the dispatcher's chat instead."
   },
   {
    "step": "Job-complete endpoint for the field",
    "tool": "n8n",
    "detail": "Second n8n workflow: **Webhook** (GET, production URL) taking `job_id` and `amount` as query params — the Telegram message contains this link pre-filled per job. On hit: **Google Sheets** (Update Row) sets Status=`Complete` + completion timestamp → **Respond to Webhook** returns a tiny 'Job marked complete ✅' HTML page so the tech sees confirmation on their phone."
   },
   {
    "step": "Invoice within minutes",
    "tool": "n8n",
    "detail": "Continuing the complete flow: **HTTP Request** POST `https://services.leadconnectorhq.com/invoices/` (Private Integration token, `Version: 2021-07-28`) creating and sending an invoice to the contact for `amount` with the service line item, due on receipt → **HTTP Request** adds tag `job-complete` to the contact."
   },
   {
    "step": "Review-request chain",
    "tool": "GHL",
    "detail": "GHL workflow 'Review Chase': trigger **Contact Tag** (`job-complete` added) → **Wait** 3 h (let them settle in with working AC) → **Send SMS** ('How did we do today? It'd mean a lot: <Google review link>') → **Wait** 3 days → **If/Else** on tag `review-left` absent → one gentle follow-up SMS → stop. Never more than two asks."
   },
   {
    "step": "Reschedule / cancel / no-show sync",
    "tool": "GHL",
    "detail": "GHL workflow 'Appt Changes': trigger **Appointment Status** (any of Rescheduled / Cancelled / No-Show) → action **Webhook** to a third n8n endpoint with `appointment_id`, new `start_time`, `status`."
   },
   {
    "step": "Board update + tech alert on changes",
    "tool": "n8n",
    "detail": "**Webhook** trigger → **Switch** on `status`: Rescheduled → **Google Sheets** (Update Row) with new time + Status=`Rescheduled`, and **Telegram** to the assigned tech '🔁 Job moved to {{new time}}'; Cancelled → Status=`Cancelled` + Telegram '❌ Do not roll'; No-Show → Status=`No-Show` + tag `no-show` in GHL via **HTTP Request**, which a small GHL workflow answers with a rebooking SMS to the customer."
   },
   {
    "step": "Morning digest",
    "tool": "n8n",
    "detail": "**Schedule Trigger** (06:30 shop-local) → **Google Sheets** (Get Rows, today's `Scheduled` jobs) → **Code** groups per tech → one **Telegram** message per tech listing their day in order, plus a dispatcher summary of unassigned jobs."
   },
   {
    "step": "Field-realistic test",
    "tool": "Test",
    "detail": "Book a test job and watch the **Webhook** execution write the row and the **Telegram** message arrive; reschedule it in GHL and confirm the board updates and the tech gets the change ping; tap the complete link from an actual phone and verify the invoice email lands within 2 minutes and the review SMS arrives after the **Wait** (shorten waits to minutes for testing, restore before handoff)."
   }
  ],
  "dataModel": [
   "GHL custom fields: `service_type` (dropdown: Install, Repair, Maintenance), `job_address` (text) if not using the native address field",
   "GHL tags: `job-complete`, `review-left`, `no-show`; calendars per service type or per tech (client's choice, document it)",
   "Google Sheet 'Dispatch Board': job_id | date | time_window | status | tech | customer | phone | address | service_type | amount | completed_at",
   "Google Sheet 'Tech Roster': ghl_user | tech_name | telegram_chat_id | truck",
   "n8n credentials: GHL Private Integration token (contacts, invoices scopes), Google Sheets OAuth, Telegram bot (techs must /start the bot once)"
  ],
  "edgeCases": [
   "Idempotency: GHL can re-fire appointment webhooks; keying every Sheets write on `job_id` with Append-or-Update makes replays harmless",
   "The job-complete link is an unauthenticated GET — include a per-job random token in the URL (generated at dispatch, stored in the row) and verify it before marking complete, or a bored customer who sees the link could fire it",
   "Phone-booked jobs only enter the system if the office books them into the GHL calendar — make that the hard rule and surface a daily 'jobs on board vs calendar' count mismatch alert",
   "A2P 10DLC registration on the review-request number, and quiet hours: a 9pm 'leave us a review' text reads as spam",
   "Timezone: `start_time` from GHL must render in shop-local time on the board and in Telegram, not UTC — off-by-hours dispatch is worse than none"
  ],
  "acceptance": [
   "A new booking appears on the dispatch board and in the assigned tech's Telegram within 60 seconds",
   "Tapping the complete link marks the row, and the customer receives the invoice within 2 minutes and the review SMS after the configured delay",
   "A reschedule in GHL updates the board row and pings the tech within 60 seconds; a cancelled test job shows '❌ Do not roll'",
   "The 06:30 digest lists each tech's jobs in time order and matches the calendar exactly for a full test week",
   "Review-request volume goes from ~10% of jobs to 100% of completed jobs (measured on the board), with a hard cap of two asks per customer"
  ],
  "portfolio": [
   "Loom: book a job, show board + Telegram, reschedule it live, then complete it from a phone and show the invoice email and review SMS — the whole lifecycle in one take",
   "Case-study angle: 'from personal-phone dispatch to a system' — the wasted-truck-roll story and 1-3 day invoice lag are the pain hooks; frame review volume as the growth lever",
   "Honest framing: demonstration build with a fictional shop ('Ironworks Heating & Air' works well) — real clients care that the appointment-lifecycle handling works, not the fake customer names",
   "Screenshot the tokenized complete-link check — small security touches on field-facing endpoints read as senior"
  ],
  "stretch": [
   "Payment status loop: catch GHL invoice-paid events and mark the board row `Paid`, with a Friday unpaid-invoices digest",
   "Route new unassigned jobs by tech zone (zip prefix map in a **Code** node) instead of manual assignment",
   "Add before/after photo capture: the complete page becomes a tiny form that uploads to Drive and links from the board row"
  ]
 },
 {
  "id": "c06",
  "title": "AI Resume Screen to Interview Calendar in One Pipeline",
  "industry": "recruiting",
  "stack": "ghl+n8n",
  "difficulty": "advanced",
  "hours": "8-12 h",
  "brief": [
   "We're a five-recruiter agency placing skilled trades and light-industrial roles. Our job posts pull 300-450 applications a month through the application form on our site. Two recruiters spend, honestly, half their week doing first-pass resume reads — 60% of applicants are instantly unqualified (no certification, wrong state, no driver's license where required), and finding that out costs the same 3 minutes as finding a great one.",
   "Meanwhile the good candidates go cold. Trades candidates take the first decent offer; if we don't get them scheduled within a day or two, they're gone. Our current time-from-application-to-first-interview averages 6 days. And rejected candidates just... evaporate. No pool, no nurture — even though this month's 'no' for a journeyman role is next quarter's 'yes' for an apprentice posting.",
   "I want applications screened the moment they arrive: resume parsed, scored against the specific job's requirements, summarized in two sentences a recruiter can trust, and slotted into the right pipeline stage automatically. High scorers should get an interview self-booking link immediately — nights and weekends included. Clear no's get a respectful decline and land in a talent pool we can actually re-mine."
  ],
  "painPoints": [
   "Two recruiters burn ~20 hours/week each on first-pass reads, 60% of it on obviously unqualified applicants",
   "6-day average application-to-interview lag in a market where candidates accept offers in 3-4 days",
   "Zero talent pool: 300+ monthly rejections are lost forever instead of nurtured for future roles",
   "Screening quality varies by recruiter and by how tired they are at 4pm on Friday"
  ],
  "whyStack": "GHL can host the application form, pipelines, calendars, and nurture — but it cannot open a PDF resume, extract its text, or run a rubric-based LLM screen with structured output; there is no native document-parsing or AI-scoring step. n8n does that whole middle: download the uploaded resume, **Extract from File**, an **OpenAI** screen locked to strict JSON against per-job requirements pulled from a config sheet, and validated parsing before anything touches the pipeline. Compared to Make, n8n's **Code** node makes the JSON-schema validation and score-band logic auditable in one place (recruiting decisions need an inspectable trail), and at 400 multi-step runs a month, self-hosted n8n keeps the per-application cost near zero while the agency scales postings.",
  "guide": [
   {
    "step": "Application intake",
    "tool": "GHL",
    "detail": "GHL form 'Apply Now' per job posting with name, email, phone, `job_id` (hidden field per posting), file-upload for the resume, and two knockout questions. Workflow: trigger **Form Submitted** → action **Webhook** (POST to n8n production URL) sending all fields including the resume file URL and `contact_id`."
   },
   {
    "step": "Fetch job requirements",
    "tool": "n8n",
    "detail": "**Webhook** trigger → **Google Sheets** (Get Rows) on 'Job Config' matching `job_id` → yields `must_haves`, `nice_to_haves`, `location_req`, `cert_req`, `interview_calendar_link`, `hiring_recruiter`. New posting = new row; the screen adapts with zero workflow edits."
   },
   {
    "step": "Get the resume text",
    "tool": "n8n",
    "detail": "**HTTP Request** (GET the resume file URL, response format `File`) → **Extract from File** node (PDF operation; add a **Switch** on file extension routing .docx to the corresponding extract operation). **IF** extracted text < 200 chars (scan/image resume) → tag `manual-screen` via **HTTP Request** and notify the recruiter — never AI-score an empty parse."
   },
   {
    "step": "Strict-JSON AI screen",
    "tool": "n8n",
    "detail": "**OpenAI** node (Message a Model): system prompt embeds the job's `must_haves`/knockouts and demands ONLY `{\"score\": 0-100, \"knockout_failed\": true|false, \"knockout_reason\": \"...\", \"summary\": \"2 sentences\", \"flags\": [\"...\"]}` — instruct it to score the resume against the rubric, never invent facts, and mark `knockout_failed` for hard requirement misses. Temperature low."
   },
   {
    "step": "Validate before acting",
    "tool": "n8n",
    "detail": "**Code** node: try/catch `JSON.parse`, assert `score` is 0-100 and required keys exist; on any failure, retry the model once with the error appended, then fall back to tag `manual-screen`. An automation that silently mis-parses a screening verdict is a lawsuit, not a bug."
   },
   {
    "step": "Write the verdict to the contact",
    "tool": "n8n",
    "detail": "**HTTP Request** PUT `/contacts/{contactId}` (Private Integration token, `Version: 2021-07-28`) setting custom fields `ai_score`, `ai_summary`, `ai_flags`, `screened_job_id` → **Google Sheets** (Append Row) to 'Screen Log' with the full model output for the audit trail."
   },
   {
    "step": "Score-band routing",
    "tool": "n8n",
    "detail": "**Switch**: `knockout_failed` OR score < 40 → **HTTP Request** creates opportunity in pipeline 'Applicants – {{job}}' stage `Declined – Pool` + tag `talent-pool`; 40-69 → stage `Recruiter Review` + tag `needs-review`; ≥ 70 → stage `Interview Invite` + tag `fast-track`."
   },
   {
    "step": "Fast-track self-booking",
    "tool": "GHL",
    "detail": "GHL workflow: trigger **Contact Tag** (`fast-track` added) → **Send SMS** + **Send Email** with the recruiter's GHL calendar link ('You look like a strong fit for {{job}} — grab an interview slot: ...') → **Wait** 24 h → **If/Else** no booking → nudge SMS → notify recruiter to call. Trigger **Customer Booked Appointment** moves the opportunity to `Interview Scheduled`."
   },
   {
    "step": "Respectful decline + nurture pool",
    "tool": "GHL",
    "detail": "Workflow on tag `talent-pool`: **Wait** 4 h (never instant — an instant rejection screams 'a robot binned you') → **Send Email** with a warm decline that explicitly says they're in the pool for future roles → add to smart list 'Talent Pool' segmented by trade, which future postings blast first before spending ad budget."
   },
   {
    "step": "Recruiter review queue",
    "tool": "GHL",
    "detail": "Workflow on tag `needs-review` → **Add Task** to `hiring_recruiter` with the `ai_summary` in the task body and a 24 h due date — the human decides mid-band cases, and their decision (drag to `Interview Invite` or `Declined – Pool` stage) is the final word."
   },
   {
    "step": "Calibration test",
    "tool": "Test",
    "detail": "Run 15 sample resumes (5 obvious yes, 5 obvious no with knockout misses, 5 borderline) through the **Webhook** production URL. Verify: all knockouts caught with correct `knockout_reason`, zero obvious-yes candidates below 70, borderlines land in `Recruiter Review`, the scan-image resume routes to `manual-screen` before ever reaching the **OpenAI** node, and the Screen Log captures every verdict verbatim."
   }
  ],
  "dataModel": [
   "GHL custom fields: `ai_score` (number), `ai_summary` (large text), `ai_flags` (text), `screened_job_id` (text), `trade_category` (dropdown)",
   "GHL pipeline per active posting 'Applicants – {{job}}': Applied → Recruiter Review → Interview Invite → Interview Scheduled → Offer → Placed / Declined – Pool",
   "GHL tags: `fast-track`, `needs-review`, `talent-pool`, `manual-screen`; smart list 'Talent Pool' filtered by tag + trade",
   "Google Sheet 'Job Config': job_id | title | must_haves | nice_to_haves | cert_req | location_req | recruiter | calendar_link | active",
   "Google Sheet 'Screen Log': timestamp | contact_id | job_id | score | knockout_failed | summary | flags | raw_model_output | routed_stage"
  ],
  "edgeCases": [
   "Repeat applicants: upsert on email/phone but keep per-job opportunities separate; a prior `talent-pool` tag must not suppress a new application's screen for a different role",
   "Bias and compliance: the rubric must score only job-related requirements (certs, licenses, experience) — log every verdict in Screen Log, keep a human decision on all mid-band and all final rejections, and say so in client docs; several jurisdictions regulate automated employment screening",
   "Malformed model output or provider outage: the retry-then-`manual-screen` fallback means the pipeline degrades to 'recruiter reads it', never to 'application lost' — test this by revoking the OpenAI key mid-batch",
   "Resume files that are images/scans or 15 MB portfolios: length guard before the model call, size guard before the download, both routing to `manual-screen`",
   "Webhook test vs production: calibrate against `/webhook-test/` with the 15-resume batch, but sign-off runs must hit the production URL from the real GHL form"
  ],
  "acceptance": [
   "A submitted application is screened, scored, staged, and (if fast-track) invited within 5 minutes, on camera",
   "The 15-resume calibration batch: 100% of knockout misses declined with a stated reason, 0 obvious-fit resumes scored below 70, all borderlines routed to human review",
   "Application-to-interview-booked time for fast-track candidates measured under 24 h in the test week (vs the 6-day baseline)",
   "Every automated verdict is reproducible from the Screen Log (input, rubric, output, route) — the client's compliance requirement",
   "Declined candidates receive the delayed, respectful email and appear in the Talent Pool smart list under the right trade",
   "Recruiters confirm the two-sentence summaries are accurate enough to trust for a full test week"
  ],
  "portfolio": [
   "Loom: submit an application with a strong resume, watch the n8n screen run, show the strict JSON in the execution log, the pipeline card landing in `Interview Invite`, and the booking SMS — then submit a knockout-fail resume and show the pool path",
   "Case-study angle: 'first-pass screening in minutes, humans on the judgment calls' — lead with 40 recruiter-hours/week and the 6-day-to-24-hour interview lag",
   "Framing matters doubly here: state it's a demonstration build with synthetic resumes, AND show the human-in-the-loop design and audit log — responsible-AI posture is a selling point to agency owners who've read the headlines",
   "Include the Screen Log screenshot: an auditable verdict trail is the artifact that makes this feel like enterprise work"
  ],
  "stretch": [
   "Auto-generate 3 tailored phone-screen questions per fast-track candidate from resume gaps, inserted into the recruiter's task",
   "Re-mine the pool: when a new Job Config row activates, an n8n **Schedule Trigger** flow scores existing Talent Pool contacts against it and fast-tracks matches",
   "Weekly calibration report comparing AI scores to recruiter final decisions to catch rubric drift"
  ]
 },
 {
  "id": "c07",
  "title": "Webinar Machine: Registration to Replay Without a Human",
  "industry": "coaching/webinars",
  "stack": "ghl+n8n",
  "difficulty": "advanced",
  "hours": "10-14 h",
  "brief": [
   "I run a coaching business that sells a $1,800 group program almost entirely through a weekly live webinar on Zoom. We drive 250-400 registrations a week from ads into a GoHighLevel funnel. The problem is everything between 'registered' and 'bought': my VA manually exports the GHL registrant list, imports it into Zoom, and copies each person's join link back into a spreadsheet — 3-4 hours a week, and every week a few people get no join link at all. Those are paid-ad leads we torched.",
   "After the webinar it gets worse. Zoom knows exactly who showed up and for how long, but that report gets downloaded 'eventually', so everyone — attendees who watched 80 minutes and no-shows alike — gets the same generic follow-up email a day late. My close rate on attendees is around 8-9%; on no-shows it's basically zero, and I'm speaking to both audiences identically.",
   "I want the plumbing to disappear: register in my funnel → instantly registered in Zoom with a personal join link in the confirmation and every reminder → after the webinar, attendees and no-shows automatically split into different follow-up tracks — attendees get the offer sequence while it's hot, no-shows get a replay drip that pushes them to the next live one. I should wake up Thursday to a report of registered / attended / watch time, not a to-do list."
  ],
  "painPoints": [
   "3-4 VA hours weekly on CSV export/import between GHL and Zoom, with join-link misses torching paid leads",
   "Follow-up is generic and ~24 h late; attendees (8-9% close) and no-shows (~0%) get identical treatment",
   "No-show rate ~55% with no systematic replay-to-next-live recovery path",
   "Zero attendance analytics reaching the owner without manual report downloads"
  ],
  "whyStack": "GHL's native Zoom integration covers 1:1 calendar meetings — it cannot register contacts into a Zoom *webinar*, retrieve per-registrant join links, or consume Zoom's attendance webhooks; that whole loop is API-only. n8n handles the Zoom Server-to-Server OAuth dance in an **HTTP Request** chain, answers Zoom's webhook URL-validation challenge (a **Crypto**/**Code** + **Respond to Webhook** trick most visual tools fumble), and reconciles attendance before tagging contacts back in GHL, which then runs the reminder ladder and branched follow-up it's built for. Make can call the Zoom API too, but the validation handshake, per-attendee watch-time reconciliation in a **Code** node, and a webhook listener that must never miss a `webinar.ended` event favor n8n — and at 400 registrants a week the per-operation math isn't close.",
  "guide": [
   {
    "step": "Registration out of the funnel",
    "tool": "GHL",
    "detail": "GHL funnel page with the registration form; workflow 'Reg → Zoom': trigger **Form Submitted** (filter to the webinar form) → action **Webhook** (POST to n8n production URL) with `first_name`, `last_name`, `email`, `phone`, `contact_id`, and `webinar_occurrence` (hidden field or inferred)."
   },
   {
    "step": "Zoom auth",
    "tool": "n8n",
    "detail": "**HTTP Request** POST `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=...` with Basic auth (Server-to-Server OAuth app client id/secret from n8n credentials) → returns a bearer token valid ~1 h. Wrap it as the first node of any Zoom-calling flow (or cache it in a workflow static-data **Code** node to respect Zoom's token endpoint limits)."
   },
   {
    "step": "Register into the webinar",
    "tool": "n8n",
    "detail": "**HTTP Request** POST `https://api.zoom.us/v2/webinars/{webinarId}/registrants` (bearer token) with `email`, `first_name`, `last_name`, and `occurrence_ids` for recurring webinars → response contains the personal `join_url` and `registrant_id`."
   },
   {
    "step": "Write the join link back",
    "tool": "n8n",
    "detail": "**HTTP Request** PUT `https://services.leadconnectorhq.com/contacts/{contactId}` (Private Integration token, `Version: 2021-07-28`) setting custom fields `zoom_join_url`, `zoom_registrant_id`, `webinar_date` → **Google Sheets** (Append Row) to 'Webinar Ledger': email, contact_id, registrant_id, occurrence, registered_at."
   },
   {
    "step": "Confirmation + reminder ladder",
    "tool": "GHL",
    "detail": "GHL workflow: trigger **Contact Tag** (`webinar-registered`, added by the n8n write-back) → **Send Email** confirmation with `{{contact.custom_field.zoom_join_url}}` → **Wait** until 24 h before → reminder email → 1 h before → **Send SMS** with the personal link → 10 min before → final SMS. Every touchpoint uses the personal join URL, so attendance tracks per person."
   },
   {
    "step": "Zoom webhook listener + validation",
    "tool": "n8n",
    "detail": "Dedicated **Webhook** node (POST, production URL) registered in the Zoom app for `webinar.ended` and `webinar.participant_joined`. First branch: **IF** `event == \"endpoint.url_validation\"` → **Crypto** node (HMAC-SHA256 of `plainToken` with the Zoom secret token) → **Respond to Webhook** returning `{plainToken, encryptedToken}` — without this Zoom refuses to activate the subscription."
   },
   {
    "step": "Attendance reconciliation",
    "tool": "n8n",
    "detail": "On `webinar.ended`: **Wait** 10 min (Zoom finalizes reports) → **HTTP Request** GET `https://api.zoom.us/v2/past_webinars/{uuid}/participants` (paginate with `next_page_token`) → **Code** sums join/leave durations per email into `watch_minutes` → **Merge** against the Webinar Ledger registrant list so every registrant resolves to attended-with-minutes or no-show."
   },
   {
    "step": "Tag the split back into GHL",
    "tool": "n8n",
    "detail": "**Loop Over Items** → per registrant, **HTTP Request** updates `watch_minutes` and adds tag: `webinar-attended` (≥ 10 min), `webinar-left-early` (1-9 min), or `webinar-no-show` — and removes `webinar-registered` so ladders stop cleanly. Ledger rows updated with the outcome."
   },
   {
    "step": "Branched follow-up",
    "tool": "GHL",
    "detail": "Three GHL workflows on **Contact Tag**: `webinar-attended` → offer sequence starting within 30 min (recap email + checkout link, day-2 objections email, day-4 deadline SMS); `webinar-left-early` → 'the part you missed' email with a timestamped replay link, then merges into the offer track; `webinar-no-show` → replay drip (3 emails over 5 days) ending with **Send SMS** invite + registration link for next week's live, which re-enters the whole machine."
   },
   {
    "step": "Thursday morning report",
    "tool": "n8n",
    "detail": "**Schedule Trigger** (Thu 07:00) → **Google Sheets** ledger for this week's occurrence → **Code** computes registered, attended, show rate, average watch minutes, and replay-drip re-registrations → **Gmail** one-page report to the owner + **Slack** headline to #marketing."
   },
   {
    "step": "Full dry-run on a test webinar",
    "tool": "Test",
    "detail": "Create a private test webinar; register 3 test contacts through the real funnel (**Webhook** production URLs everywhere, never `/webhook-test/`); join with two of them for a few minutes, leave one as a no-show; end the webinar and verify the **Respond to Webhook** validation handshake held, attendance tags land correctly with plausible `watch_minutes`, each contact enters the right GHL branch, and the ledger + report agree."
   }
  ],
  "dataModel": [
   "GHL custom fields: `zoom_join_url` (text), `zoom_registrant_id` (text), `webinar_date` (date), `watch_minutes` (number)",
   "GHL tags: `webinar-registered`, `webinar-attended`, `webinar-left-early`, `webinar-no-show`, `replay-rereg`",
   "Google Sheet 'Webinar Ledger': occurrence_id | email | contact_id | registrant_id | registered_at | outcome | watch_minutes | followup_track",
   "Zoom: Server-to-Server OAuth app (scopes webinar:write, webinar:read, report:read) + Webhook subscription (webinar.ended, participant events) with secret token",
   "n8n credentials: Zoom S2S client id/secret, GHL Private Integration token, Google Sheets OAuth, Gmail, Slack"
  ],
  "edgeCases": [
   "Zoom webhook endpoint validation: the CRC challenge must be answered with the HMAC within 3 seconds — keep that branch dead simple and first in the flow, and re-validate after any n8n URL change",
   "Email mismatch: attendees sometimes join Zoom with a different email than they registered with — reconcile on `registrant_id` where present and fall back to fuzzy email match, routing true orphans to a manual-review sheet tab rather than mis-tagging",
   "Rate limits both directions: 400 registrants means paginated participant reports (Zoom `next_page_token`) and 400 GHL contact updates — **Loop Over Items** with small batches and a **Wait** keeps under GHL's 100-req/10s burst",
   "Duplicate registrations: same email registering twice must not create two Zoom registrants — check the ledger first; Zoom silently returns the same registrant, but your ladder would double-send",
   "Timezone: reminder ladder times and 'starts in 1 hour' math must use the webinar's timezone, and the recurring-webinar `occurrence_ids` must target the right week's session"
  ],
  "acceptance": [
   "A funnel registration produces a Zoom registrant and a confirmation email containing the personal join link within 2 minutes, no VA touch",
   "The dry-run's two joiners are tagged `webinar-attended` with watch minutes within ±2 of reality; the abstainer is tagged `webinar-no-show`",
   "Attendee offer sequence starts within 30 minutes of `webinar.ended`; the no-show replay drip starts the next morning",
   "Zero registrants missing a join link across two consecutive live weeks (the ledger proves coverage)",
   "The Thursday report's registered/attended/show-rate matches Zoom's own dashboard numbers for the same occurrence",
   "A no-show completing the replay drip and re-registering flows through the entire machine again untouched"
  ],
  "portfolio": [
   "Loom: register live on the funnel, show the Zoom registrant appear and the personal link in the confirmation email, fast-forward through a test webinar, then show the attended/no-show tags landing and the two different follow-up emails — end on the Thursday report",
   "Case-study angle: 'the money is in the split' — same traffic, but attendees get the offer while it's hot and no-shows get a recovery path; anchor on the 55% no-show pool being previously worth ~$0",
   "Demonstration-build honesty: test webinar, fictional coach, synthetic registrants — and note that the Zoom S2S + webhook validation work is identical for any real account",
   "Show the CRC validation branch in the Loom for 10 seconds; anyone who has fought Zoom webhooks will instantly rate the build senior"
  ],
  "stretch": [
   "Watch-time-based offers: ≥ 45 min attendees get a 'you saw the whole offer' fast-action bonus SMS; sub-15-min early leavers get the timestamped pitch section",
   "Auto-create next week's webinar occurrence and rotate the funnel's hidden `webinar_occurrence` field from n8n",
   "Pipe the ledger into a running cohort dashboard: show rate and close rate per traffic source (UTM captured at registration)"
  ]
 },
 {
  "id": "c08",
  "title": "Trial-to-Paid Engine: Usage-Scored Nurture for a SaaS",
  "industry": "SaaS",
  "stack": "ghl+n8n",
  "difficulty": "advanced",
  "hours": "10-14 h",
  "brief": [
   "I'm the founder of a B2B scheduling SaaS — $79/month, 14-day free trial, roughly 350 trial signups a month, self-serve. Our trial-to-paid rate is stuck at 11%. Everyone gets the same 5-email drip on the same schedule regardless of what they actually do in the product. The data is painful: trials that create a calendar and send one booking link in the first 3 days convert around 40%; trials that never finish onboarding convert under 2%. We speak to both groups identically.",
   "Our app already emits webhooks for the events that matter — `signup_completed`, `calendar_created`, `booking_link_sent`, `first_booking_received`, `team_member_invited`, `login`. They currently go nowhere. My one lifecycle marketer can see all this in our analytics tool but has no way to *act* on it: she can't trigger an SMS to a trial that's been silent for 4 days, and our support inbox only hears from stuck users after they've already decided to leave.",
   "I want every trial scored continuously from real usage: stuck users pulled into a rescue track (helpful nudge, then a human offer of a 15-minute setup call), activated users pushed toward the paid decision at the right moment with usage-aware messaging ('your links got 12 bookings this week'), and a Monday churn-risk digest showing my marketer exactly which trials are dying and why — while the scoring brain stays in one place I can tune without rebuilding email flows."
  ],
  "painPoints": [
   "11% trial-to-paid with one-size-fits-all messaging, while behavior predicts a 40%-vs-2% conversion spread the drip ignores",
   "Product usage webhooks exist but are literally unconsumed — the highest-signal data goes nowhere",
   "Stuck trials surface only when they email support to cancel; no proactive rescue exists",
   "The lifecycle marketer can see the data but cannot trigger a single message from it"
  ],
  "whyStack": "GHL cannot receive arbitrary product-event webhooks into a stateful per-user ledger, compute a decaying activity score across events, or maintain counters — its workflow triggers are contact-level and stateless, so 'no login for 4 days AND never created a calendar' is inexpressible natively. n8n owns the event firehose: a **Webhook** ingests every product event, a Data Table keeps the per-trial ledger, a scheduled **Code** pass computes scores and state transitions, and only *meaningful changes* are written to GHL as fields and tags — where GHL then does exactly what it's great at: multi-channel nurture, SMS, call bookings, and pipelines. Make struggles here on cost and shape alike: ~350 trials × dozens of events each is thousands of operations monthly on a per-op bill, and the scoring pass is a real program that belongs in a **Code** node, not a 30-module visual chain.",
  "guide": [
   {
    "step": "Event ingestion endpoint",
    "tool": "n8n",
    "detail": "**Webhook** node (POST, production URL, Header Auth — the app sends a shared secret header n8n verifies) receiving `{event, user_id, email, timestamp, properties}` → **Code** validates the shape, whitelists known `event` names, and normalizes the timestamp to UTC → unknown events append to a 'Dead Letter' table instead of erroring."
   },
   {
    "step": "Ledger write",
    "tool": "n8n",
    "detail": "n8n **Data Table** 'trial_ledger' (or Google Sheet if the client wants visibility): upsert on `user_id`, incrementing per-event counters (`logins`, `calendars_created`, `links_sent`, `bookings_received`, `invites`), setting `last_active_at`, and stamping `trial_started_at` on `signup_completed`. A second table 'event_log' appends every raw event for audit/debug."
   },
   {
    "step": "Mirror new trials into GHL",
    "tool": "n8n",
    "detail": "On `signup_completed`: **HTTP Request** POST `https://services.leadconnectorhq.com/contacts/upsert` (Private Integration token, `Version: 2021-07-28`) with `email`, custom fields `app_user_id`, `trial_start`, `trial_end` (+14 d), tag `trial-active` → **HTTP Request** creates an opportunity in pipeline 'Trials' stage `Started`."
   },
   {
    "step": "Scoring pass",
    "tool": "n8n",
    "detail": "Second workflow: **Schedule Trigger** (hourly) → read `trial_ledger` for `trial-active` users → **Code** computes `activity_score` 0-100 (weighted: booking received 30, link sent 20, calendar 15, invite 15, logins with recency decay 20) and a `state`: `activated` (score ≥ 60 or first_booking), `progressing`, `stuck` (score < 25 AND day ≥ 3), `dormant` (no login 4+ days). Emits ONLY users whose state changed since last pass (previous state stored on the ledger row)."
   },
   {
    "step": "Push state changes to GHL",
    "tool": "n8n",
    "detail": "**Loop Over Items** over the changed set → **HTTP Request** PUT `/contacts/{id}` updating `activity_score`, `usage_state`, `bookings_this_week` → second call swaps tags (`state-stuck`, `state-activated`, `state-dormant` — remove the old, add the new) → moves the Trials opportunity stage to match. Tag swaps, not tag piles: GHL workflows key off the transitions."
   },
   {
    "step": "Stuck-user rescue track",
    "tool": "GHL",
    "detail": "Workflow: trigger **Contact Tag** (`state-stuck` added) → **Send Email** (specific to what's missing, using `usage_state` detail fields: 'you haven't created your first calendar — it takes 90 seconds, here's the 2-min video') → **Wait** 2 days → **If/Else** still tagged `state-stuck` → **Send SMS** offering a free 15-min setup call with a GHL calendar link → booked calls create a task for the founder. Exit immediately when the tag is removed (they moved states)."
   },
   {
    "step": "Power-user upgrade push",
    "tool": "GHL",
    "detail": "Workflow on `state-activated`: **Send Email** with usage-aware social proof ('Your links took {{contact.custom_field.bookings_this_week}} bookings this week — here's what Pro adds') → **Wait** until day 10 of trial → **If/Else** not converted → founder-signed 'anything holding you back?' email → day 13 → deadline SMS with an annual-discount option. Conversion (a `subscription_started` product event) flips the tag to `customer` from n8n and exits everything."
   },
   {
    "step": "Dormant reactivation",
    "tool": "GHL",
    "detail": "Workflow on trigger **Contact Tag** (`state-dormant` added): **Send Email** ('still want this?') with a magic-login link → **Wait** 24 h → **Send SMS**, then stop — dormant users get exactly two touches; anything more trains spam complaints. Re-login flips them back to `progressing` automatically via the scoring pass."
   },
   {
    "step": "Monday churn-risk digest",
    "tool": "n8n",
    "detail": "**Schedule Trigger** (Mon 07:00) → **Code** over the ledger: trials expiring this week ranked by score ascending, each with days left, state, top missing action, and email → **Gmail** digest to the marketer + **Slack** post to #growth with the top-10 at-risk list as actionable lines ('Day 11, score 12, never created calendar → offer setup call')."
   },
   {
    "step": "Error + replay safety",
    "tool": "n8n",
    "detail": "**Error Trigger** workflow → **Slack** alert. Ingestion is idempotent: dedupe on the app's `event_id` field in the ledger so the app's webhook retries never double-count a booking (and therefore never inflate a score across the activation threshold falsely)."
   },
   {
    "step": "Simulated-cohort test",
    "tool": "Test",
    "detail": "Script (or **Code**-node generator) fires a synthetic 20-user cohort at the production endpoint over compressed time: activation paths, stuck paths, a dormant user, plus duplicate-delivery events. Verify ledger counters, exactly one state-change push per transition, correct GHL tag swaps, the rescue SMS firing for stuck users only, and a Monday digest that ranks the cohort correctly."
   }
  ],
  "dataModel": [
   "GHL custom fields: `app_user_id` (text), `activity_score` (number), `usage_state` (dropdown: activated/progressing/stuck/dormant), `trial_start` (date), `trial_end` (date), `bookings_this_week` (number)",
   "GHL tags: `trial-active`, `state-activated`, `state-progressing`, `state-stuck`, `state-dormant`, `customer`; pipeline 'Trials': Started → Activated → Decision Window → Converted / Expired",
   "n8n Data Table 'trial_ledger': user_id | email | trial_started_at | logins | calendars_created | links_sent | bookings_received | invites | last_active_at | activity_score | state | prev_state | last_event_id",
   "n8n Data Table 'event_log' (append-only raw events) and 'dead_letter' (unknown events)",
   "App side: webhook destination = n8n production URL with shared-secret header; documented event contract for the 6 event types"
  ],
  "edgeCases": [
   "At-least-once delivery from the app: dedupe on `event_id` before incrementing counters — a replayed `first_booking_received` must not fake an activation",
   "Score flapping: a user oscillating around a threshold would swap tags hourly and restart GHL workflows — add hysteresis (state changes require crossing by a margin, and `stuck`→`progressing` requires a real event, not just decay math)",
   "Webhook test vs production: the app's webhook config must point at the n8n production URL; the `/webhook-test/` URL dies when the editor closes and the events are unrecoverable — this is the #1 way this build silently fails",
   "Timezone and trial-day math: 'day 3 of trial' computed from `trial_started_at` in the user's timezone where known, else product UTC — off-by-one here sends the day-13 deadline SMS on day 14 after expiry",
   "A2P 10DLC + consent: SMS only to trials who provided a phone and accepted messaging at signup; the rescue SMS is helpful once, spam twice"
  ],
  "acceptance": [
   "The synthetic cohort test shows every user in the correct final state with correct counters, and duplicate events changed nothing",
   "A stuck-profile user receives the rescue email at the right trial day and the setup-call SMS 2 days later; an activated user receives the usage-aware upgrade email with their real booking count merged in",
   "State transitions appear in GHL (fields + swapped tags + pipeline stage) within one scoring cycle (≤ 1 h) of the qualifying event",
   "The Monday digest ranks expiring trials by risk and the marketer confirms each line's 'top missing action' is accurate",
   "Exactly zero messages sent to `customer`-tagged or expired trials during a full test cycle (exit-condition audit)",
   "Founder can tune a scoring weight in one **Code** node and see downstream behavior change without touching any GHL workflow"
  ],
  "portfolio": [
   "Loom: fire product events from a terminal on camera, show the ledger row updating, the state flip to `stuck`, the tag swap in GHL, and the rescue SMS arriving — then fire a booking event and show the same user flip to the upgrade track; end on the Monday digest",
   "Case-study angle: 'behavior-based lifecycle vs calendar-based drip' — anchor on the 40%-vs-2% conversion spread that generic nurture ignores; frame the build as the missing actuation layer between product analytics and messaging",
   "Honest framing: demonstration build with a synthetic event stream standing in for the product — emphasize that the event contract (6 webhook types) is the only integration a real SaaS needs to provide",
   "Show the hysteresis/dedupe code for 15 seconds in the Loom — score-flapping and replay handling are exactly the failure modes a technical founder will probe in the sales call"
  ],
  "stretch": [
   "Post-conversion expansion: keep scoring paid users and trigger a `power-user` upsell track (team plan) plus an early-warning tag when a paying customer's score collapses",
   "Weekly cohort report: trial-to-paid rate by starting state and by rescue-track exposure, to prove the engine's lift honestly",
   "Let the marketer edit scoring weights in a config sheet the **Code** node reads, instead of editing code"
  ]
 },
 {
  "id": "c09",
  "title": "Order-Exceptions Desk",
  "industry": "e-commerce",
  "stack": "make",
  "difficulty": "advanced",
  "hours": "6-9 h",
  "brief": [
   "We run an outdoor-gear store shipping ~60 orders a day from our own storefront, which can POST every new order to a URL as JSON. About 8-10 orders a day are 'exceptions' — the billing and shipping addresses don't match, the order is over $500, or it contains a SKU we're actually out of because our storefront stock counts lag the warehouse spreadsheet by half a day.",
   "Right now my ops person reads EVERY order at 7am and 2pm, cross-checks it against the warehouse inventory sheet, and copies the bad ones into a 'problems' tab by hand. Twice last month a high-value order shipped to a mismatched address and we ate a $340 reship. Out-of-stock orders sit unnoticed until the picker hits the empty shelf.",
   "What I want: exceptions get pulled aside automatically the second the order lands — a ticket row, a ping to our ops Telegram group, and a polite 'we're double-checking your order' email to the customer. Clean orders should flow straight to the fulfillment sheet the pickers already work from. Nobody should re-read 50 clean orders a day to find the 8 bad ones."
  ],
  "painPoints": [
   "Two manual review passes a day (~90 min of ops time) to catch ~8 exceptions out of ~60 orders",
   "Address-mismatch orders occasionally ship anyway — $300+ reship costs and chargeback risk",
   "Storefront stock lags the warehouse inventory sheet, so out-of-stock SKUs get sold and discovered at pick time",
   "Customers with held orders hear nothing until they complain, so exception orders generate support tickets on top of everything",
   "No record of which exceptions occurred or how they were resolved"
  ],
  "whyStack": "This is a routing problem with three data sources meeting at one moment, and Make's canvas shows the whole triage visually — the owner's non-technical ops person can open the scenario and literally see which filter pulled an order aside, which matters when they inherit the maintenance. Volume math works too: ~60 orders/day at roughly 6-9 operations each lands comfortably in a Core plan's monthly allowance, especially with the inventory lookup served from a Data store instead of a per-line-item Sheets search. Native Google Sheets, Gmail, and Telegram modules mean zero custom code; a code-first platform would be overkill for a shop with no developer, and the per-task pricing of simpler tools gets ugly when one order fans out into multiple checks.",
  "guide": [
   {
    "step": 1,
    "tool": "Setup",
    "detail": "Create three Google Sheets tabs in one spreadsheet: `Fulfillment` (clean orders for the pickers), `Exceptions` (the ticket queue), and `Inventory` (`sku`, `on_hand` — seed ~15 SKUs, two with `on_hand` = 0). Create a Telegram bot with @BotFather and add it to the ops group. Save 4 curl-able test payloads (these will teach the **Custom Webhook** its structure later): clean, address-mismatch, high-value ($620), and one containing an out-of-stock SKU — each with a nested `customer` object, `shipping`/`billing` address objects, an `items[]` array (`sku`, `name`, `qty`), and a numeric `total`."
   },
   {
    "step": 2,
    "tool": "Make",
    "detail": "Build the inventory cache so the intake never pays a Sheets search per line item. Create a Data store `inventory_cache` (structure: `on_hand` Number, `loaded_at` Date). Loader scenario, scheduled every morning: **Google Sheets: Search Rows** on `Inventory` → **Data store: Add/replace a record** with Key = `{{lower(sku)}}`, Overwrite ON."
   },
   {
    "step": 3,
    "tool": "Make",
    "detail": "Intake scenario: **Custom Webhook** named `orders-in` → Run once and curl the clean payload so Make learns the structure. Immediately after the webhook, add **Tools: Set multiple variables**: `addr_mismatch` = `{{if(1.shipping.zip != 1.billing.zip; true; false)}}`, `high_value` = `{{if(1.total >= 500; true; false)}}` (numeric comparison, not text)."
   },
   {
    "step": 4,
    "tool": "Make",
    "detail": "Stock check: **Iterator** over the webhook's `items[]` → **Data store: Get a record** from `inventory_cache` with Key = `{{lower(sku)}}`, 'Continue the execution of the route even if the module returns no results' ON → **Array Aggregator** (Source = the Iterator) collecting `sku`, `qty`, and the cache's `on_hand`, but only aggregating bundles that pass a pre-aggregator filter `on_hand < qty OR on_hand does not exist`. The aggregator output array length is your out-of-stock count."
   },
   {
    "step": 5,
    "tool": "Make",
    "detail": "**Router** after the aggregator. Route `Exception` — filter: `addr_mismatch` equal to `true` OR `high_value` equal to `true` OR `{{length(oos_array)}}` greater than `0` (numeric). Route `Clean` — set as the fallback route so nothing can silently match neither."
   },
   {
    "step": 6,
    "tool": "Make",
    "detail": "Exception route: **Google Sheets: Add a Row** to `Exceptions` — `ticket_id` = `EX-{{formatDate(now; \"YYYYMMDD\")}}-{{1.order_id}}`, `reasons` = a joined string of the tripped flags, `status` = `open`, plus order id, customer, email, total, timestamp. Then **Telegram Bot: Send a Text Message or a Reply** to the ops group: `⚠️ {{ticket_id}} — {{1.order_id}} — {{reasons}} — ${{1.total}}`."
   },
   {
    "step": 7,
    "tool": "Make",
    "detail": "Still on the exception route: **Gmail: Send an Email** to `{{1.customer.email}}` — the holding email: 'We're running a routine check on your order {{1.order_id}} before it ships; nothing is needed from you unless we reach out within one business day.' No mention of fraud or stock — reasons stay internal."
   },
   {
    "step": 8,
    "tool": "Make",
    "detail": "Clean route: **Google Sheets: Add a Row** to `Fulfillment` — order id, date, customer, email, item summary (build with a **Text Aggregator** off the Iterator earlier, or a `join(map(...))` mapping), total, `status` = `ready_to_pick`."
   },
   {
    "step": 9,
    "tool": "Make",
    "detail": "Finish with **Webhooks: Webhook Response** — status `200`, body `{\"received\": \"{{1.order_id}}\"}` so the storefront gets an acknowledgment either way. Attach an error handler to both Add a Row modules: **Break** (with retries enabled) plus a **Telegram Bot: Send a Text Message or a Reply** alert on the handler route, so a Sheets outage retries instead of dropping an order."
   },
   {
    "step": 10,
    "tool": "Test",
    "detail": "Replay all four payloads with curl against the **Custom Webhook** (Run once before each). Verify: 1 fulfillment row, 3 exception tickets with the correct `reasons`, 3 Telegram pings, 3 holding emails, 4 webhook 200s. Then send the same clean payload twice and confirm your dedupe guard (see edge cases) keeps the fulfillment sheet at one row. Check History: a clean order should cost ~8-10 operations."
   }
  ],
  "dataModel": [
   "Sheet `Fulfillment`: order_id, date, customer, email, items_summary, total, status",
   "Sheet `Exceptions`: ticket_id, order_id, date, customer, email, total, reasons, status (open/resolved), resolved_at",
   "Sheet `Inventory`: sku, on_hand (warehouse-maintained, loaded to the Data store daily)",
   "Data store `inventory_cache`: key = lower(sku); fields: on_hand (Number), loaded_at (Date)",
   "Data store `seen_orders`: key = order_id; fields: received_at (Date) — the dedupe ledger for webhook retries"
  ],
  "edgeCases": [
   "Storefront webhook retries: check `seen_orders` Data store first and stop duplicates before they cost a full run or a double fulfillment row",
   "Malformed payload (missing `items[]` or non-numeric `total`): a first router route filtering on `order_id does not exist OR total does not exist` writes a quarantine ticket instead of crashing mid-scenario",
   "SKU in the order but not in the inventory cache: treat as an exception (unknown SKU), not as in-stock — that's why the Get a record uses continue-on-empty",
   "Operations budget: the Data store cache keeps a 3-line-item order at ~9 ops; doing the stock check with Google Sheets: Search Rows per item would roughly double it at 60 orders/day",
   "Sheets API rate limits during a flash-sale burst: the Break error handler with retries absorbs short 429 windows without losing orders"
  ],
  "acceptance": [
   "All four test payload classes route correctly on replay, 10 out of 10 times",
   "A clean order appears in `Fulfillment` within 30 seconds of the webhook POST",
   "Every exception produces exactly one ticket row, one Telegram alert, and one holding email — no duplicates on webhook retry",
   "An order containing an out-of-stock SKU never reaches the `Fulfillment` sheet",
   "One standard order costs ≤ 10 operations in History; projected monthly usage at 60 orders/day fits the chosen Make plan with ≥ 30% headroom",
   "A deliberately malformed payload lands in quarantine with a Telegram alert instead of an errored execution"
  ],
  "portfolio": [
   "Record a 3-4 minute Loom: curl one clean and one exception order live, then open History and walk the exception bundle through the router while naming each filter",
   "Export the intake and loader blueprints and include them (with connections stripped) alongside canvas screenshots",
   "Frame it honestly: 'demonstration build with a simulated storefront webhook — the trigger swaps for Shopify/WooCommerce with the rest of the architecture unchanged'",
   "Include a one-page ops-cost table: operations per clean order vs per exception, and the monthly projection at 60 orders/day"
  ],
  "stretch": [
   "Add a resolution flow: a second **Custom Webhook** hit from a link in the Telegram alert marks the ticket resolved and releases the order to `Fulfillment`",
   "Score exceptions (mismatch + high-value together = priority) and give priority tickets a distinct Telegram alert and a shorter SLA column",
   "Swap the curl storefront for Shopify's order webhook in test mode to prove the architecture is source-agnostic"
  ]
 },
 {
  "id": "c10",
  "title": "Reservation & No-Show Shield",
  "industry": "restaurant",
  "stack": "make",
  "difficulty": "intermediate",
  "hours": "5-8 h",
  "brief": [
   "I own a 14-table bistro doing ~35 reservations a night, ~50 on Fridays and Saturdays. Bookings come in through the form on our website, which can send each booking to a webhook URL as JSON. My problem is no-shows: we lose 4-6 covers on a weekend night, and a no-showed 6-top on a Saturday is roughly $300 of food we prepped and a table I turned other people away from.",
   "Today the confirmation story is 'my host texts people when she remembers.' Nobody reminds guests the day before. Big parties are the worst offenders and we have no deposit process at all — I have a payment link from my card processor, I just never send it.",
   "I want every booking confirmed instantly, a reminder the day before and again 3 hours out, parties of 6 or more asked for a $10-a-head deposit via my payment link, and when we mark someone a no-show, a 'we missed you, here's 15% off a weeknight' email a couple of days later. And at close of night I'd love one message telling me tomorrow's covers and how many big parties are coming."
  ],
  "painPoints": [
   "4-6 no-show covers per weekend night, worst on parties of 6+ where the revenue hit is $250-350",
   "Confirmations and reminders depend on one host's memory — inconsistent and unverifiable",
   "No deposit process for large parties even though a payment link already exists",
   "No-shows are never followed up, so a recoverable guest is lost for good",
   "The owner has zero visibility into tomorrow's load without calling the host"
  ],
  "whyStack": "A restaurant owner will maintain this personally, and Make's visual scenarios are the only style of tool where 'the reminder ladder' is a picture rather than code — that is decisive for a buyer with no technical staff. The volumes are small (35-50 bookings/day, two reminder sweeps, one digest), so even with SMS modules in the mix this runs in the low thousands of operations a month — comfortably inside an entry plan, which keeps the pitch honest: software cost under a single saved no-show. Native modules for Sheets, Gmail, Twilio, and Telegram cover every touchpoint with no custom code, and the scheduled-scenario model fits the day-before/3-hours-out cadence naturally.",
  "guide": [
   {
    "step": 1,
    "tool": "Setup",
    "detail": "Create a Google Sheet `Reservations` with columns for booking id, name, email, phone, party_size, date, time, status, deposit_sent, reminder_24h, reminder_3h, winback_sent. Get a static deposit payment link from the card processor (Stripe/Square payment link is fine). Create the owner's Telegram chat with your bot. Prepare 3 test bookings as curl payloads for the **Custom Webhook**: a 2-top, a 6-top, and one for tomorrow evening."
   },
   {
    "step": 2,
    "tool": "Make",
    "detail": "Intake scenario: **Custom Webhook** `bookings-in` → **Google Sheets: Add a Row** to `Reservations` with `booking_id` = `{{formatDate(now; \"YYMMDDHHmmss\")}}`, `status` = `booked`, the three reminder/deposit flags empty → **Gmail: Send an Email** instant confirmation (date, time, party size, 'reply to change')."
   },
   {
    "step": 3,
    "tool": "Make",
    "detail": "Deposit branch: **Router** after the confirmation. Route `Large party` — filter `party_size` greater than or equal to `6` (numeric operators). On it: **Gmail: Send an Email** with the deposit link ('$10/head, applied to your bill') and **Google Sheets: Update a Row** setting `deposit_sent` = `{{now}}`. Fallback route: nothing further — small parties end after the confirmation."
   },
   {
    "step": 4,
    "tool": "Make",
    "detail": "Reminder ladder, scenario 2, scheduled hourly from 09:00-21:00: **Google Sheets: Search Rows** — `status` equal to `booked` AND `date` equal to `{{formatDate(addDays(now; 1); \"YYYY-MM-DD\")}}` AND `reminder_24h` is empty → **Twilio: Create a Message** (or **Gmail: Send an Email** where no phone) with the day-before reminder → **Google Sheets: Update a Row** stamping `reminder_24h` = `{{now}}`. The stamp column IS the dedupe — a row can never get the same reminder twice."
   },
   {
    "step": 5,
    "tool": "Make",
    "detail": "Same scenario, second **Router** route for the 3-hour reminder: **Google Sheets: Search Rows** — today's date AND `time` within 3-4 hours from now (compare with `parseDate` + `dateDifference` in the filter) AND `reminder_3h` empty → **Twilio: Create a Message** 'See you at {{time}} — running late? Reply here.' → **Google Sheets: Update a Row** stamps `reminder_3h`."
   },
   {
    "step": 6,
    "tool": "Make",
    "detail": "No-show winback, scenario 3, scheduled daily 10:00: staff flip `status` to `no_show` in the sheet after service. **Google Sheets: Search Rows** — `status` equal to `no_show` AND `winback_sent` empty AND `date` at least 2 days ago → **Gmail: Send an Email** the 15%-off weeknight offer, written warm not passive-aggressive → **Google Sheets: Update a Row** stamps `winback_sent`."
   },
   {
    "step": 7,
    "tool": "Make",
    "detail": "Nightly digest, scenario 4, scheduled 22:30: **Google Sheets: Search Rows** for tomorrow's `booked` rows → **Text Aggregator** building one line per booking (`{{time}} — {{name}} × {{party_size}}{{if(party_size >= 6; \" ★ DEPOSIT\"; \"\")}}`) → **Telegram Bot: Send a Text Message or a Reply** to the owner: total covers (sum via `sum(map(...))` in the mapping), party count, big-party count, then the list."
   },
   {
    "step": 8,
    "tool": "Test",
    "detail": "Curl the three test bookings into the **Custom Webhook** (Run once before each). Verify: 3 sheet rows, 3 confirmations, exactly one deposit email (the 6-top). Manually set one booking to tomorrow and run the ladder scenario with Run once — reminder fires once, stamp written; run it again immediately — zero sends. Mark one row `no_show`, backdate it 2 days, run the winback. Run the digest and check the math against the sheet."
   }
  ],
  "dataModel": [
   "Sheet `Reservations`: booking_id, name, email, phone, party_size, date (YYYY-MM-DD), time (HH:mm), status (booked/seated/no_show/cancelled), deposit_sent, reminder_24h, reminder_3h, winback_sent",
   "Timestamp-stamp columns double as dedupe flags — every send writes its own stamp",
   "Digest requires no extra storage; it reads tomorrow's rows and aggregates in-flight"
  ],
  "edgeCases": [
   "Reminder scenario runs hourly — the stamp columns are what make that safe; without them every run re-sends everything",
   "Same-day bookings: a guest booking at 5pm for 7pm must not get a day-before reminder for a date that already passed — the 24h filter checks tomorrow's date exactly, and the 3h route covers them",
   "A guest who cancels by replying: staff set `status` = `cancelled`; every Search Rows filter includes `status = booked` so cancelled rows fall out of all ladders automatically",
   "Missing phone number: route SMS-less bookings to a Gmail fallback with a filter on `phone` is empty rather than letting Twilio error",
   "Operations budget: hourly polling costs ~1 op per empty run — 13 sweeps/day of mostly-empty searches is ~400 ops/month of overhead, worth showing the owner it's negligible"
  ],
  "acceptance": [
   "Every webhook booking produces a sheet row and a confirmation email within 60 seconds",
   "Parties of 6+ (and only those) receive the deposit email, exactly once",
   "The 24h and 3h reminders each fire exactly once per booking across repeated hourly runs (proven by running the sweep 3 times in a row)",
   "Rows marked `no_show` receive exactly one winback email, 2 or more days later, and never a reminder afterwards",
   "The 22:30 digest matches a manual count of tomorrow's covers and flags all deposit-owing parties",
   "Cancelled bookings receive no further messages of any kind"
  ],
  "portfolio": [
   "Loom the guest journey end-to-end: book via curl, show the confirmation, force-run the reminder sweep, mark a no-show, show the winback — 4 minutes",
   "Export all four scenario blueprints and screenshot the ladder scenario's History showing a second run sending nothing (the dedupe proof)",
   "Frame it as a demonstration build with a simulated booking form — note the trigger swaps for OpenTable/Resy-style webhooks or a Typeform where available",
   "Include a one-slide ROI sketch: 2 saved no-show covers a week vs the Make plan cost — conservative numbers only"
  ],
  "stretch": [
   "Replace the static deposit link with **Stripe: Create a Payment Link** so the amount auto-scales to `party_size × $10`",
   "Add a reply-to-cancel path: **Twilio: Watch Incoming Messages** parses 'CANCEL' and flips the row status automatically",
   "Track no-show rate per guest phone number in a Data store and require deposits from repeat offenders at any party size"
  ]
 },
 {
  "id": "c11",
  "title": "Invoice Chaser with Escalation",
  "industry": "accounting",
  "stack": "make",
  "difficulty": "intermediate",
  "hours": "5-7 h",
  "brief": [
   "We're a 6-person accounting practice with ~180 invoices outstanding at any time, tracked in a Google Sheet exported weekly from our practice software. Chasing is done by whoever feels guilty first: an admin scrolls the sheet on Fridays, picks the oldest-looking rows, and sends whatever wording she improvises that day. Average debtor days are 41 and climbing, and about $60k is sitting past 30 days right now.",
   "We already know the ladder we want — a friendly nudge at 7 days overdue, a firm letter at 21, a final notice at 35 — we just never execute it consistently. And when something hits 45 days, a partner should hear about it the same day, not discover it at quarter-end.",
   "Payments come in via bank transfer; I can drop the bank's transaction export CSV into a Drive folder every morning. Matching payments to invoices is another 20 minutes a day of eyeballing references. If the chaser also marked invoices paid off that CSV, the whole collections routine would run itself and my admin gets her Fridays back."
  ],
  "painPoints": [
   "41 average debtor days and ~$60k past 30 days, with chasing frequency depending on admin guilt",
   "No consistent escalation wording — every chase email is improvised, some too soft, some too aggressive for a client relationship",
   "Partners learn about 45-day-plus debts weeks late",
   "20 minutes daily of manually matching bank-export lines to invoice references",
   "No audit trail of who was chased when, which matters if a debt ever goes legal"
  ],
  "whyStack": "This is scheduled polling over a spreadsheet with date arithmetic and a branch per aging bucket — exactly the shape Make's scheduled scenarios plus Router plus built-in date functions (`parseDate`, `dateDifference`) handle without a line of code, and the practice manager can read the ladder on the canvas like a flowchart. Volumes are tiny: one daily sweep over ~180 rows where most rows die at a filter costs a few hundred operations a month, so the entry plan covers it many times over — per-operation pricing is a non-issue at accounting-firm volumes. Native Google Sheets, Google Drive, CSV, Gmail, and Telegram modules cover the entire loop; a heavier platform buys nothing here but a maintenance burden the firm can't service.",
  "guide": [
   {
    "step": 1,
    "tool": "Setup",
    "detail": "Google Sheet `Invoices`: invoice_no, client, email, amount, due_date, status, stage, last_chase, paid_date. Seed 10 test rows spread across aging buckets: current, 8 days overdue, 22 days, 36 days, 47 days, plus one already `paid`. Write the three email templates (polite / firm / final) WITH the partners — the wording is a client-relationship decision, not an automation decision. Create a `Bank Exports` folder in Drive (the reconciler's **Google Drive: Watch Files in a Folder** will watch it) and a sample transaction CSV whose reference column contains two real invoice numbers and one garbage reference."
   },
   {
    "step": 2,
    "tool": "Make",
    "detail": "Chaser scenario, scheduled daily 08:00 on business days: **Google Sheets: Search Rows** — `status` equal to `open`, Maximum returned rows 250. Every downstream decision keys off `{{dateDifference(now; parseDate(due_date; \"YYYY-MM-DD\"); \"days\")}}` — compute it once in a **Tools: Set variable** named `days_overdue` right after the search."
   },
   {
    "step": 3,
    "tool": "Make",
    "detail": "**Router** with four routes filtered on `days_overdue` (numeric operators) AND the row's current `stage`, so a row only advances one rung: `Polite` — days_overdue ≥ 7 AND stage is empty; `Firm` — days_overdue ≥ 21 AND stage equal to `polite`; `Final` — days_overdue ≥ 35 AND stage equal to `firm`; `Escalate` — days_overdue ≥ 45 AND stage equal to `final`. Rows matching nothing die at the router for ~2 ops."
   },
   {
    "step": 4,
    "tool": "Make",
    "detail": "Polite / Firm / Final routes are structurally identical: **Gmail: Send an Email** with that rung's agreed template (merge `client`, `invoice_no`, `amount`, `due_date`) → **Google Sheets: Update a Row** setting `stage` to the rung name and `last_chase` = `{{formatDate(now; \"YYYY-MM-DD\")}}`. The stage-gate in the filter is the dedupe: a 30-day invoice that already got the firm letter matches no route tomorrow."
   },
   {
    "step": 5,
    "tool": "Make",
    "detail": "Escalate route: **Telegram Bot: Send a Text Message or a Reply** to the partners' chat — `🔴 {{invoice_no}} · {{client}} · ${{amount}} · {{days_overdue}} days — full ladder exhausted` → **Google Sheets: Update a Row** sets `stage` = `escalated`. No further client emails from the machine past this point; that call is the partner's."
   },
   {
    "step": 6,
    "tool": "Make",
    "detail": "Reconciliation scenario: **Google Drive: Watch Files in a Folder** on `Bank Exports` → **Google Drive: Download a File** → **CSV: Parse CSV** (headers ON, match the bank's delimiter) → for each transaction row, **Google Sheets: Search Rows** on `Invoices` where `invoice_no` equal to the parsed reference AND `status` equal to `open`, max 1."
   },
   {
    "step": 7,
    "tool": "Make",
    "detail": "**Router** in the reconciler: route `Matched` (search found a row AND parsed `amount` equals the row's amount within tolerance) → **Google Sheets: Update a Row**: `status` = `paid`, `paid_date` from the transaction date. Route `Unmatched or partial` (fallback) → **Google Sheets: Add a Row** to a `Recon Queue` tab with the raw transaction line for a human, plus one **Text Aggregator** → **Telegram Bot: Send a Text Message or a Reply** summary per file: `Bank file processed: 14 matched, 2 for review`."
   },
   {
    "step": 8,
    "tool": "Make",
    "detail": "Resilience: attach an error handler with **Break** (retries) to the Gmail module — a transient send failure must not advance `stage` (order the route so Update a Row comes AFTER a successful send). Attach **Ignore** + a Telegram alert to the CSV parse so one malformed bank file alerts instead of blocking tomorrow's file."
   },
   {
    "step": 9,
    "tool": "Test",
    "detail": "Run the chaser with **Run once** against the seeded rows: exactly one email per eligible row, correct template per bucket, stages written. Run it again immediately — zero sends (stage-gates hold). Drop the sample CSV in the folder: two invoices flip to `paid`, the garbage reference lands in `Recon Queue`, one Telegram summary arrives. Age a test row to 47 days with `stage` = `final` and confirm the partner ping."
   }
  ],
  "dataModel": [
   "Sheet `Invoices`: invoice_no, client, email, amount, due_date (YYYY-MM-DD), status (open/paid/disputed), stage (empty/polite/firm/final/escalated), last_chase, paid_date",
   "Sheet `Recon Queue`: file_name, txn_date, reference, amount, reason (no_match/amount_mismatch), reviewed",
   "Sheet `Chase Log` (optional but recommended for the audit trail): timestamp, invoice_no, rung, recipient — one Add a Row per send",
   "Bank export CSV (input): txn_date, description, reference, amount — column names vary by bank; document the mapping"
  ],
  "edgeCases": [
   "Stage-gating: filtering on days_overdue alone would resend the firm letter every single day an invoice sits between 21 and 34 days — the stage column is the guard, test it by double-running",
   "Disputed invoices: a `disputed` status must exit every filter; chasing a client mid-dispute is how firms lose clients",
   "Partial payments: amount mismatch routes to `Recon Queue` instead of silently marking paid — never auto-close on a reference match alone",
   "Duplicate bank files (same export dropped twice): matched invoices are already `paid` so the search filter `status = open` finds nothing — re-runs are naturally idempotent, verify it",
   "Weekend/holiday sends: schedule the chaser business-days-only; a final notice landing Saturday 8am reads worse than the same email on Monday"
  ],
  "acceptance": [
   "Daily run chases every eligible invoice with the correct rung template and advances its stage — verified across all seeded aging buckets",
   "An immediate second run sends zero emails (idempotency proof in History)",
   "Any invoice reaching 45 days with the ladder exhausted pings the partner chat the same morning",
   "A dropped bank CSV marks matching invoices paid and routes every unmatched or amount-mismatched line to `Recon Queue` with a summary alert",
   "Paid and disputed invoices receive no chase emails under any run",
   "Full month of operation projected under 3,000 operations at 180 open invoices"
  ],
  "portfolio": [
   "Loom the ladder: show a seeded sheet, run once, open two received emails (polite vs firm) side by side, then show the second run sending nothing",
   "Export both blueprints; screenshot the Router with its four stage-gate filters open — that filter logic IS the piece interviewers ask about",
   "Frame honestly: demonstration build on synthetic invoices and a mock bank export; wording templates presented as client-configurable, not your copy",
   "Include the audit-trail angle in your writeup: `Chase Log` as evidence trail for debts that go legal — it shows you think past the happy path"
  ],
  "stretch": [
   "Generate a monthly aging report: scheduled scenario aggregates buckets with **Text Aggregator** and emails partners a summary table plus total exposure",
   "Add a payment-plan flag: rows marked `plan` get a gentler monthly reminder ladder instead of the standard one",
   "Pull invoices directly from Xero/QuickBooks modules instead of the weekly sheet export, keeping the same ladder logic"
  ]
 },
 {
  "id": "c12",
  "title": "Content Repurposing Factory",
  "industry": "content/media",
  "stack": "make",
  "difficulty": "advanced",
  "hours": "7-10 h",
  "brief": [
   "I run a coaching brand built on one deep piece of content a week — a 3,000-4,000 word blog post or a 40-minute YouTube video with a transcript. The problem is everything downstream: that one piece should become a LinkedIn post, an X thread, and a section of my newsletter, and right now that repurposing is 4-5 hours of my Sunday or it just doesn't happen. Last quarter I published 13 long pieces and only 4 ever got a LinkedIn version.",
   "I've tried dumping the transcript into a chatbot by hand — the drafts are usable, but the workflow is chaos: no consistent prompts, drafts scattered across chat history, and half never make it to the posting queue. I will not auto-publish AI text under my name, ever. I want to approve every draft from my phone with one tap.",
   "Dream flow: I drop the finished transcript or post into a folder, and within minutes I get each platform draft on Telegram with approve/reject buttons. Approved drafts land in a per-channel queue sheet my VA posts from. Rejected ones just die. My Sunday goes from 5 hours to 20 minutes of tapping."
  ],
  "painPoints": [
   "4-5 hours weekly of manual repurposing, so ~70% of long-form pieces never become social content",
   "Ad-hoc chatbot prompting produces inconsistent voice and formats week to week",
   "Drafts live in chat history with no pipeline — approved-but-never-posted is the default outcome",
   "The owner refuses (rightly) to auto-publish AI text, so any solution needs a real human gate, not a checkbox",
   "The VA has no single queue to post from, so posting cadence is erratic"
  ],
  "whyStack": "The hard part here isn't the AI call — it's the pipeline around it: watch a folder, fan one source into three drafts, hold them for human approval, and release approved ones into queues. Make handles every stage with native modules (**Google Drive**, **OpenAI**, **Telegram Bot**, **Google Sheets**, **Data store**), and the approval gate is elegantly cheap: Telegram inline links pointing back at a Make webhook, no app to build. At one source piece a week the operation count is trivial — the real spend is OpenAI tokens, which Make lets you keep visible per-execution in History. For a solo creator, a visual canvas they can tweak prompts on beats any code-first alternative they'd need a developer to touch.",
  "guide": [
   {
    "step": 1,
    "tool": "Setup",
    "detail": "Create a Drive folder `Repurpose Inbox`, a Google Sheet with tabs `LinkedIn Queue`, `X Queue`, `Newsletter Queue` (columns: draft_id, source_title, content, approved_at, posted), and a Data store `drafts` (fields: channel Text, content Text, source_title Text, status Text, created_at Date). Write the three system prompts WITH the client from 2-3 of their best past posts per platform — voice cloning by example beats clever instructions. Connect the OpenAI API key so the **OpenAI: Create a Chat Completion** modules have a working connection."
   },
   {
    "step": 2,
    "tool": "Make",
    "detail": "Generation scenario: **Google Drive: Watch Files in a Folder** on `Repurpose Inbox` (Google Docs only) → **Google Docs: Get Content of a Document** to pull the full text. Add a filter after the trigger: word count > 500 (`{{length(split(text; \" \"))}}`, numeric) so a stray note dropped in the folder doesn't burn tokens."
   },
   {
    "step": 3,
    "tool": "Make",
    "detail": "Three **OpenAI: Create a Chat Completion** modules in sequence (not parallel routes — you want all three drafts even if one needs a retry): one per channel, each with its platform system prompt, the source text as the user message, temperature ~0.7, and an explicit format contract in the prompt (LinkedIn: hook + line breaks + no hashtag spam; X: numbered thread, ≤ 275 chars per tweet, `---` separators; newsletter: 200-word section with a subject-line suggestion)."
   },
   {
    "step": 4,
    "tool": "Make",
    "detail": "After each completion, **Data store: Add/replace a record** in `drafts` — Key = `{{formatDate(now; \"YYMMDDHHmmss\")}}-li` (per-channel suffix), fields: `channel`, `content` = the completion text, `source_title` = the Doc name, `status` = `pending`, `created_at` = `{{now}}`. The Data store is the holding pen; nothing touches the queue sheets yet."
   },
   {
    "step": 5,
    "tool": "Make",
    "detail": "Approval scenario (build this BEFORE sending any Telegram message that references it): **Custom Webhook** `draft-decision` expecting query params `draft` and `action`. Then **Data store: Get a record** with Key = `{{1.draft}}`; add a filter — record exists AND `status` equal to `pending` — so a double-tapped link can't approve twice."
   },
   {
    "step": 6,
    "tool": "Make",
    "detail": "Back in the generation scenario, per draft: **Telegram Bot: Send a Text Message or a Reply** to the owner — the draft text (truncate preview to ~800 chars with `substring`), then two links built from the approval webhook URL: `✅ Approve: {{webhook_url}}?draft={{key}}&action=approve` and `❌ Reject: ...&action=reject`. Three messages per source piece, one per channel."
   },
   {
    "step": 7,
    "tool": "Make",
    "detail": "Approval scenario continued: **Router**. Route `Approve` (filter `action` equal to `approve`): a nested **Router** on `channel` sends the draft to the right tab via **Google Sheets: Add a Row** (`LinkedIn Queue` / `X Queue` / `Newsletter Queue`) → **Data store: Update a record** sets `status` = `approved`. Route `Reject`: **Data store: Update a record** sets `status` = `rejected`. Both routes end with **Webhooks: Webhook Response** returning a tiny HTML page — `<h2>✅ Approved — queued for LinkedIn</h2>` — so the phone tap gets visible confirmation."
   },
   {
    "step": 8,
    "tool": "Make",
    "detail": "Resilience: on each **OpenAI: Create a Chat Completion**, an error handler route with **Ignore** + **Telegram Bot: Send a Text Message or a Reply** ('LinkedIn draft failed for {{source_title}} — rerun the file') so one API hiccup doesn't kill the other two drafts. Rename every module; this canvas is a portfolio centerpiece."
   },
   {
    "step": 9,
    "tool": "Test",
    "detail": "Drop a real 3,000-word past post into the folder and let **Google Drive: Watch Files in a Folder** pick it up. Verify: 3 Telegram messages within ~2 minutes, each draft in the client's voice and format contract. Approve LinkedIn, reject X, ignore newsletter. Check: 1 row in `LinkedIn Queue`, statuses `approved`/`rejected`/`pending` in the Data store, browser shows the confirmation page. Tap the approve link a second time — nothing duplicates (the pending-status filter blocks it)."
   },
   {
    "step": 10,
    "tool": "Test",
    "detail": "Stale-draft sweep test: add a small scheduled scenario — **Data store: Search records** where `status` = `pending` and `created_at` older than 7 days → **Data store: Delete a record**, with a weekly Telegram note of how many expired. Run it against a backdated record to prove the holding pen can't grow forever."
   }
  ],
  "dataModel": [
   "Data store `drafts`: key = timestamp+channel suffix; fields: channel (li/x/nl), content (Text), source_title (Text), status (pending/approved/rejected), created_at (Date)",
   "Sheet `LinkedIn Queue` / `X Queue` / `Newsletter Queue`, identical columns: draft_id, source_title, content, approved_at, posted (VA checks off)",
   "Drive folder `Repurpose Inbox`: input Google Docs, one per source piece",
   "Prompt doc (versioned in Drive): the three system prompts with example posts — treat prompts as client-owned config, not hidden magic"
  ],
  "edgeCases": [
   "Very long transcripts can exceed the model's context or your token budget — truncate input to ~12k words with `substring` and note the cut in the Telegram message rather than failing silently",
   "Double-tap on an approval link: the `status = pending` filter in the approval webhook makes the second tap a no-op — prove it in testing",
   "Approval links contain no auth: anyone with the URL could approve, so keep webhook URLs out of screenshots/Looms, and note the stretch fix (secret token param checked by filter)",
   "One OpenAI failure must not kill the other two channels — Ignore-handler per completion module, alert instead of abort",
   "Token spend visibility: at 4 pieces/month this is a few dollars, but log completion token counts to a column so the client sees cost per piece, not a surprise bill"
  ],
  "acceptance": [
   "Dropping one source Doc yields three platform drafts on Telegram in under 5 minutes, each meeting its format contract",
   "Approve tap → correct queue tab row within 15 seconds, with a visible confirmation page; reject tap → no row anywhere",
   "Repeated taps on the same link never create duplicate queue rows",
   "No content ever reaches a queue sheet without an explicit human approve action (demonstrated by leaving one draft pending overnight)",
   "A forced OpenAI error on one channel still delivers the other two drafts plus an alert",
   "Owner's weekly repurposing time reduced to under 30 minutes (tap-and-review only), measured across two real weeks"
  ],
  "portfolio": [
   "Loom the full loop on your phone screen: file drop → Telegram buzzes → tap approve → show the queue row appear — the phone-tap moment is the demo money-shot",
   "Export both blueprints and screenshot the approval Router with the status-gate filter open",
   "Frame honestly: human-approved AI drafting, never auto-publishing — that framing is a selling point to skeptical creators, lead with it",
   "Show the prompt doc structure (with a sample voice prompt) to demonstrate that voice quality is engineered, not lucky"
  ],
  "stretch": [
   "Add a secret token to approval links (`&t={{sha256(key + salt)}}` checked by a webhook filter) to close the open-URL hole",
   "Auto-post approved LinkedIn drafts via the native LinkedIn module on a schedule, keeping X and newsletter manual — a staged-trust rollout",
   "Add a 'revise' third button that sends the draft back through OpenAI with the owner's feedback text appended"
  ]
 },
 {
  "id": "c13",
  "title": "Two-Channel Inventory Guard",
  "industry": "retail",
  "stack": "make",
  "difficulty": "advanced",
  "hours": "7-10 h",
  "brief": [
   "We sell ~450 SKUs of board games through our own Shopify store (~25 orders/day) and a niche marketplace that has no API — it emails us a sales-report CSV every night and takes stock updates only as a CSV upload we prepare. Both channels sell from the same single stockroom.",
   "Oversells are killing our marketplace rating: Shopify sells the last two copies of something at 2pm, the marketplace doesn't know until I manually reconcile 'sometime that week', and meanwhile it sells a copy we don't have. Nine oversells last month, each one a grovelling refund email and a rating hit — we're at 4.3 and the marketplace buries listings below 4.5.",
   "I need one source of truth for stock that both channels update and read from: Shopify sales decrement it live, the nightly marketplace CSV decrements it on import, Shopify's available quantity gets corrected when the marketplace sells something, and a fresh stock CSV for the marketplace gets generated every night. Alert me when anything drops below 3 units, and when an oversell does slip through, I want it logged with numbers, not discovered by an angry customer."
  ],
  "painPoints": [
   "9 oversells last month; marketplace rating at 4.3 and sinking below the visibility threshold",
   "Stock reconciliation between channels happens manually, days late, from memory and two browser tabs",
   "The marketplace's CSV-only interface means no real-time sync is possible — the gap window has to be engineered around, not wished away",
   "Low-stock situations are discovered when a channel hits zero, too late to reorder",
   "No record of oversell incidents, so the owner can't quantify the damage or spot which SKUs recur"
  ],
  "whyStack": "The core of this build is a stock ledger that two asynchronous channels read and write without trampling each other, and Make's **Data store** is purpose-built for exactly that role — a keyed record per SKU updated atomically by whichever scenario touches it. One channel is real-time (native **Shopify** modules) and one is batch CSV (native **Gmail** + **CSV** modules); Make is one of the few no-code platforms where those two tempos coexist naturally on the same ledger. Volume is ~25 webhook events plus one nightly batch over 450 SKUs — with unchanged SKUs dying at filters, that's comfortably a mid-tier plan. And when the owner asks 'why did it say 2 left?', the execution History is a per-SKU audit trail no spreadsheet macro gives you.",
  "guide": [
   {
    "step": 1,
    "tool": "Setup",
    "detail": "Google Sheet with tabs `Oversell Log` and `Stock Snapshot`. Data store `stock_ledger` (fields: on_hand Number, shopify_qty Number, marketplace_qty Number, low_alerted Text, updated_at Date), keyed by lower-cased SKU. Seed scenario (run once): **Google Sheets: Search Rows** over a stocktake export → **Data store: Add/replace a record** per SKU with counted `on_hand`. The ledger starts from a physical count, never from either channel's claim."
   },
   {
    "step": 2,
    "tool": "Make",
    "detail": "Shopify sales scenario: **Shopify: Watch Orders** (paid orders) → **Iterator** over line items → **Data store: Get a record** by `{{lower(sku)}}` → **Data store: Update a record**: `on_hand` = `{{on_hand - qty}}`, `updated_at` = `{{now}}`. Add a filter before the update — record exists — and route missing SKUs to a Telegram 'unknown SKU sold on Shopify' alert instead of failing."
   },
   {
    "step": 3,
    "tool": "Make",
    "detail": "Oversell detection lives at the moment of decrement: after the update, a **Router** route with filter `on_hand < 0` (numeric) → **Google Sheets: Add a Row** to `Oversell Log` (sku, channel = shopify, qty_short = `{{abs(on_hand)}}`, order ref, timestamp) → **Telegram Bot: Send a Text Message or a Reply**: `🚨 OVERSELL {{sku}} — short {{abs(on_hand)}} — Shopify order {{order_name}}` → clamp the ledger back to 0 with **Data store: Update a record**."
   },
   {
    "step": 4,
    "tool": "Make",
    "detail": "Marketplace import scenario, nightly: **Gmail: Watch Emails** filtered to the marketplace's report sender with attachments → **CSV: Parse CSV** on the attachment → **Iterator**-equivalent per parsed row: same Get → decrement → oversell-check chain as step 2-3, with channel = `marketplace` in the log. Dedupe the file first: store `{{md5(subject + attachment_name)}}` in a Data store `processed_files` and stop if seen — marketplaces love re-sending last night's report."
   },
   {
    "step": 5,
    "tool": "Make",
    "detail": "Push corrections to Shopify in the same nightly run, AFTER the import finishes: **Data store: Search records** where `on_hand` not equal to `shopify_qty` → per record, **Shopify: Update an Inventory Level** (location + inventory item, available = `on_hand`) → **Data store: Update a record** sets `shopify_qty` = `on_hand`. The `shopify_qty` shadow column is the loop-killer: only genuinely diverged SKUs cost a Shopify call, and your own corrections never re-trigger processing because inventory-level updates are not orders."
   },
   {
    "step": 6,
    "tool": "Make",
    "detail": "Generate the marketplace's stock file, last step of the nightly scenario: **Data store: Search records** where `on_hand` not equal to `marketplace_qty` → **CSV: Create CSV (advanced)** with the marketplace's exact column spec → **Google Drive: Upload a File** to a `Marketplace Uploads` folder (dated filename) → **Gmail: Send an Email** to the owner with the file link and a one-line summary → update each record's `marketplace_qty`. (Owner uploads it — the marketplace has no API; be explicit that this last mile is human.)"
   },
   {
    "step": 7,
    "tool": "Make",
    "detail": "Low-stock alerting, folded into every decrement path: **Router** route with filter `on_hand <= 3` AND `low_alerted` not equal to `yes` → **Telegram Bot: Send a Text Message or a Reply** `📉 {{sku}} down to {{on_hand}}` → **Data store: Update a record** sets `low_alerted` = `yes`. Clear the flag in the seed/restock flow when stock rises above 5 — a flag with hysteresis, not a daily nag."
   },
   {
    "step": 8,
    "tool": "Make",
    "detail": "Nightly snapshot for trust: end the nightly scenario with **Data store: Search records** (all) → **Google Sheets: Add a Row** per SKU changed today into `Stock Snapshot` (or a compact **Text Aggregator** digest if 450 rows is too many ops) so the owner can spot-check the ledger against shelves weekly."
   },
   {
    "step": 9,
    "tool": "Test",
    "detail": "Test matrix with a 3-SKU seed (stock 5 / 2 / 1): (a) a **Shopify: Watch Orders** test order of 2 → ledger 3, no alerts; (b) marketplace CSV selling 2 of the 2-stock SKU → ledger 0, low-stock alert; (c) marketplace CSV selling 2 of the 1-stock SKU → oversell logged, alert fired, ledger clamped to 0, next Shopify push sets it to 0; (d) re-send the same CSV email → file dedupe stops everything; (e) verify the generated upload CSV contains exactly the changed SKUs in the marketplace's column order."
   }
  ],
  "dataModel": [
   "Data store `stock_ledger`: key = lower(sku); fields: on_hand (Number), shopify_qty (Number, last value pushed to Shopify), marketplace_qty (Number, last value exported), low_alerted (Text yes/empty), updated_at (Date)",
   "Data store `processed_files`: key = md5(subject + attachment name); fields: processed_at (Date) — nightly-report dedupe",
   "Sheet `Oversell Log`: timestamp, sku, channel, qty_short, order_ref, customer_notified, resolution",
   "Sheet `Stock Snapshot`: date, sku, on_hand, shopify_qty, marketplace_qty — the human audit view",
   "Output CSV (marketplace upload): exactly the marketplace's required columns, dated filename, in `Marketplace Uploads` Drive folder"
  ],
  "edgeCases": [
   "Ledger drift vs physical reality: refunds, damaged stock, and miscounts accumulate — schedule a weekly stocktake re-seed path and say so in the docs; a sync is only as honest as its last count",
   "Duplicate marketplace reports: the md5 file-dedupe store is mandatory, not optional — a re-sent report double-decrements 450 SKUs in one run",
   "Race window: a Shopify sale during the nightly import can interleave decrements; keep the nightly run at the marketplace's quietest hour and read-then-write per SKU quickly — document the residual window honestly instead of claiming it's zero",
   "Operations budget: pushing all 450 SKUs to Shopify nightly would be ~450 ops/night; the shadow-column diff (only changed SKUs) typically cuts that by 90%+ — show both numbers",
   "Shopify API rate limits on a big correction batch: enable the Update Inventory Level module's error handler with **Break** retries so a 429 wave completes instead of half-applying"
  ],
  "acceptance": [
   "A Shopify test sale decrements the ledger within 2 minutes; a marketplace CSV import decrements it the same night",
   "A sale that takes any SKU below zero produces an Oversell Log row, a Telegram alert with the shortfall, and a clamped ledger — demonstrated live",
   "The nightly Shopify correction pushes only diverged SKUs, and pushed quantities match the ledger exactly on spot-check of 10 SKUs",
   "The generated marketplace CSV matches the marketplace's column spec and contains only changed SKUs",
   "Re-processing the same marketplace report email is a provable no-op",
   "Each SKU crossing the low-stock threshold alerts exactly once until restocked above the clear threshold"
  ],
  "portfolio": [
   "Loom the oversell moment: run the failing CSV import live, let the 🚨 alert land on screen, then show the ledger clamp and the log row — drama sells the pattern",
   "Screenshot the Data store browse view mid-sync plus both scenario canvases; export both blueprints",
   "Frame honestly: demonstration build with a Shopify dev store and a simulated marketplace feed; the CSV last-mile is human-in-the-loop because the marketplace has no API — stating the limit builds trust",
   "Write a half-page 'ledger pattern' explainer in your case study: why a Data store beats syncing the channels directly against each other"
  ],
  "stretch": [
   "Add a restock intake: a simple form webhook adds received stock, clears low-stock flags, and appends to the snapshot",
   "Compute days-of-stock per SKU from a rolling 14-day sales rate held in the ledger and alert on 'stockout inside 7 days' instead of a fixed threshold",
   "Extend the ledger to a third channel (e.g. a second marketplace CSV) to prove the pattern scales without new architecture"
  ]
 },
 {
  "id": "c14",
  "title": "Supplier Feed Normalizer",
  "industry": "wholesale",
  "stack": "make",
  "difficulty": "advanced",
  "hours": "6-9 h",
  "brief": [
   "We're a homewares wholesaler carrying ~2,800 catalog lines from four main suppliers. Every morning each supplier emails us a CSV of prices and availability — and every one is different: one uses semicolons, one has prices like '1.234,56', one calls the SKU column 'Art.Nr.', one sends header junk in the first three rows. Combined it's 3,000-4,000 rows a day.",
   "My catalog manager spends the first 2 hours of every day massaging these files in Excel into our master format and pasting them into our Airtable catalog. When she's on leave it doesn't happen at all, and we quote customers from week-old prices — last month that cost us a €900 margin hit on one order because a supplier price rise sat unapplied for six days.",
   "I want the emails picked up automatically, each supplier's format translated into our standard columns, our Airtable catalog updated in place, and anything that doesn't parse — garbage rows, missing SKUs, prices that aren't numbers — set aside in a quarantine list with a morning summary telling us what came in and what was rejected. The mapping of 'their column names to ours' should live somewhere my catalog manager can edit without calling anyone."
  ],
  "painPoints": [
   "2 hours of skilled staff time daily on mechanical file reshaping, and zero updates when she's away",
   "Week-old prices reach customer quotes; one stale price cost €900 in margin last month",
   "Four incompatible formats: different delimiters, decimal conventions, header rows, and column names",
   "Bad rows currently get hand-fixed or silently dropped with no record of either",
   "Supplier format changes are discovered by breakage, not by an alert"
  ],
  "whyStack": "Four different file dialects converging into one catalog is a mapping-and-routing job, and Make's **Router** (one route per supplier) plus per-route **CSV: Parse CSV** settings expresses the differences visually — when a fifth supplier arrives, it's a new route, not a rewrite. The column mapping lives in a Google Sheet the catalog manager edits herself, loaded into a **Data store** — configuration stays in the client's hands, which is the difference between an asset and a dependency. Daily volume is 3,000-4,000 rows, so operations discipline matters: parse once, upsert against a ledger so unchanged rows die cheap, and the whole feed runs at a fraction of what naive per-row Airtable searches would cost — this is precisely the volume band where Make's per-operation pricing still beats per-task tools by an order of magnitude.",
  "guide": [
   {
    "step": 1,
    "tool": "Setup",
    "detail": "Airtable base `Catalog`, table `Products`: Supplier, Supplier SKU, Internal SKU, Name, Price (currency), Available (number), Updated At (date). Google Sheet `Feed Config` with tabs `Column Map` (supplier, their_column, our_field) and `Quarantine` (date, supplier, raw_row, reason, resolved). Data store `catalog_ledger` (fields: airtable_id Text, last_hash Text), keyed `{{supplier}}|{{lower(supplier_sku)}}`. Collect one real sample file per supplier and document each dialect for its **CSV: Parse CSV** settings: delimiter, decimal style, header offset, encoding."
   },
   {
    "step": 2,
    "tool": "Make",
    "detail": "Config loader (runs on demand when the manager edits mappings): **Google Sheets: Search Rows** on `Column Map` → **Data store: Add/replace a record** in a `column_map` store keyed `{{supplier}}|{{their_column}}` with value `our_field`. This is what makes the mapping client-editable without touching the scenario."
   },
   {
    "step": 3,
    "tool": "Make",
    "detail": "Main scenario trigger: **Gmail: Watch Emails** on the feeds mailbox, filter: has attachment AND sender in the four supplier domains. Immediately after, a **Router** with one route per supplier filtered on the sender address — each route owns that supplier's dialect."
   },
   {
    "step": 4,
    "tool": "Make",
    "detail": "Per supplier route: **CSV: Parse CSV** with that supplier's settings (delimiter `;` vs `,`, headers row offset — for the junk-header supplier, first strip leading lines with a **Text parser** or `split`/`slice` on the raw attachment text before parsing). Normalize values in mappings, not extra modules: `Art.Nr.` → `supplier_sku`, European decimals via `{{parseNumber(replace(replace(price; \".\"; \"\"); \",\"; \".\"); \".\")}}`, `trim()` and `upper()` on SKUs."
   },
   {
    "step": 5,
    "tool": "Make",
    "detail": "Validation gate, identical on all routes after normalization: a **Router** where the `Valid` route requires `supplier_sku` exists AND `price` is numeric AND `price > 0` AND `available` ≥ 0. The `Reject` fallback route: **Google Sheets: Add a Row** to `Quarantine` with the raw row (join the original fields), supplier, and a computed `reason` string. Quarantined rows never touch Airtable."
   },
   {
    "step": 6,
    "tool": "Make",
    "detail": "Cheap upsert via the ledger: **Data store: Get a record** from `catalog_ledger` (key = `{{supplier}}|{{lower(supplier_sku)}}`, continue-if-none ON) → **Tools: Set variable** `hash` = `{{md5(price + \"|\" + available + \"|\" + name)}}` → **Router**: route `New` (ledger record does not exist) → **Airtable: Create a Record** → **Data store: Add/replace a record** storing the new `airtable_id` + `last_hash`; route `Changed` (`last_hash` ≠ `hash`) → **Airtable: Update a Record** by the ledger's `airtable_id` → refresh the ledger hash. Unchanged rows — the vast majority daily — die at this router for ~3 ops."
   },
   {
    "step": 7,
    "tool": "Make",
    "detail": "Per-file summary: count outcomes with three **Tools: Increment function** counters (or aggregate with a **Numeric Aggregator** per route) → after processing, **Telegram Bot: Send a Text Message or a Reply**: `📦 {{supplier}} feed: {{total}} rows — {{created}} new, {{updated}} price/stock changes, {{quarantined}} quarantined` → **Google Sheets: Add a Row** to a `Feed Log` tab with the same numbers and the filename."
   },
   {
    "step": 8,
    "tool": "Make",
    "detail": "Guards: file-level dedupe first thing after the trigger (store `{{md5(sender + attachment_name + date)}}` in a `processed_feeds` Data store, stop if seen). Error handler with **Ignore** + Telegram alert on **CSV: Parse CSV** — a structurally broken file should alert 'feed unreadable, format may have changed' and skip, not block the other three suppliers. Error handler with **Break** retries on the Airtable modules for rate limits (Airtable caps ~5 req/s — the ledger's suppression of unchanged rows is your main throttle)."
   },
   {
    "step": 9,
    "tool": "Test",
    "detail": "Feed all four real sample files through the test mailbox watched by **Gmail: Watch Emails**. Verify per file: correct parse (spot-check 5 rows against the raw CSV, especially European decimals), quarantine catches planted bad rows (blank SKU, price 'CALL', negative stock) with readable reasons, Telegram summaries match manual counts. Re-send file 1 unchanged — near-zero Airtable writes (ledger proof). Change one price in file 2 and re-send — exactly one Airtable update."
   }
  ],
  "dataModel": [
   "Airtable `Products`: Supplier (single select), Supplier SKU, Internal SKU, Name, Price (currency), Available (number), Updated At (date)",
   "Sheet `Column Map`: supplier, their_column, our_field — the client-editable translation table",
   "Sheet `Quarantine`: date, supplier, raw_row, reason (missing_sku/bad_price/negative_stock/unmapped_column), resolved",
   "Sheet `Feed Log`: date, supplier, filename, rows_total, created, updated, quarantined",
   "Data store `catalog_ledger`: key = supplier|lower(sku); fields: airtable_id, last_hash — the upsert + change-suppression ledger",
   "Data stores `column_map` and `processed_feeds`: mapping cache and file-level dedupe"
  ],
  "edgeCases": [
   "Same file emailed twice (suppliers do this constantly): file-hash dedupe store stops the re-run before it costs 4,000 operations",
   "European decimal formats: '1.234,56' parsed as text-to-number without the replace-chain silently becomes 1.23456 — plant a test row and assert the exact stored price",
   "Supplier silently changes their format: the parse error handler alerts instead of blocking, and a quarantine spike (e.g. > 10% of a file) should trigger its own louder Telegram warning",
   "Operations budget: 4,000 rows/day with naive Airtable Search-per-row is ~12k ops/day; the ledger pattern brings a typical low-change day under 15k/month total — present both numbers in the client math",
   "Airtable rate limits during a genuinely big price revision (500+ changed rows): Break-with-retries on the Airtable modules, and consider a **Sleep** module on that route if throttling persists"
  ],
  "acceptance": [
   "All four supplier sample files import with 100% of valid rows correctly normalized (spot-check including decimal-format rows) and zero valid rows quarantined",
   "Planted malformed rows (missing SKU, non-numeric price, negative stock) all land in Quarantine with accurate reasons and never reach Airtable",
   "Re-importing an unchanged file produces zero Airtable writes; a single changed price produces exactly one update",
   "Each processed file produces one Telegram summary whose counts reconcile with the Feed Log and Quarantine rows",
   "The catalog manager can remap a renamed supplier column via the Column Map sheet alone, and the next import respects it",
   "A deliberately corrupted file alerts and is skipped without affecting the other suppliers' imports that morning"
  ],
  "portfolio": [
   "Loom: hold up two raw supplier CSVs side by side (semicolons vs junk headers), run the import, then show both landed identically in Airtable — the before/after IS the pitch",
   "Export the blueprint and screenshot the four-route supplier Router plus the quarantine tab with real rejected rows and reasons",
   "Frame honestly: demonstration build on anonymized supplier file formats; emphasize the client-editable mapping sheet as the handover story",
   "Include the ops-cost comparison table (naive vs ledger pattern) — it demonstrates you price your builds like an engineer"
  ],
  "stretch": [
   "Auto-flag margin risks: compare new supplier price to the Internal price list and Telegram-alert any line where margin drops below a threshold",
   "Add a weekly 'stale SKU' sweep: catalog lines no supplier has mentioned in 14 days get flagged for discontinuation review",
   "Onboard a fifth supplier using only a new Router route + Column Map rows, and time yourself — the onboarding time is a sellable metric"
  ]
 },
 {
  "id": "c15",
  "title": "NPS Pipeline with Detractor Rescue",
  "industry": "SaaS",
  "stack": "make",
  "difficulty": "intermediate",
  "hours": "5-8 h",
  "brief": [
   "We're a 9-person B2B SaaS with ~1,100 active accounts. Our in-app NPS survey collects 30-50 responses a week and can POST each one to a webhook as JSON: email, score 0-10, an optional comment, and the account's plan. Right now responses pile up in the survey tool's dashboard and we look at them monthly, if that.",
   "The expensive failure is detractors: last quarter we churned three accounts (about $14k ARR) that had each left an angry 2-or-3 score weeks before cancelling. Nobody saw the score until the churn post-mortem. A same-hour founder email to those accounts would plausibly have saved at least one.",
   "What I want: a detractor triggers an instant alert in our team Telegram, gets a personal-toned email from me within the hour, and lands on a follow-up task list someone owns. Passives get a genuinely useful tips email. Promoters get asked for a G2 review, or a referral if they're on our top plan. And every Monday I want the week's NPS number appended to a trend sheet so we finally have a line, not anecdotes."
  ],
  "painPoints": [
   "Detractor signals sit unread for weeks; three churned accounts (~$14k ARR) gave loud advance warning last quarter",
   "No follow-up ownership: even when someone sees a bad score, there's no task or SLA attached",
   "Promoters are never asked for reviews while they're happiest — the G2 profile has 6 reviews, all old",
   "NPS is computed ad hoc in a spreadsheet quarterly, so nobody can see whether product changes move it",
   "Survey-tool webhook retries occasionally deliver the same response twice, which would corrupt any naive count"
  ],
  "whyStack": "Score-based routing is Make's home turf: one **Custom Webhook**, one **Router** with three numeric-filtered routes, native **Gmail**, **Telegram Bot**, and **Google Sheets** modules for every action — a founder or ops lead can read the whole policy off the canvas and change an email template without a developer. At 30-50 responses a week plus one weekly rollup, this runs in the hundreds of operations a month, so the free-to-entry tier genuinely covers it — worth saying out loud to a cost-conscious small SaaS. The weekly NPS calculation needs no database: filtered Sheets searches and mapping-panel math do it in four operations.",
  "guide": [
   {
    "step": 1,
    "tool": "Setup",
    "detail": "Google Sheet with tabs `Responses` (response_id, date, email, account, plan, score, comment, segment), `Rescue Tasks` (date, email, account, score, comment, owner, status, due), and `NPS Trend` (week_start, responses, promoters, passives, detractors, nps). Create the **Data store** `seen_responses` keyed by response_id. Draft the founder apology-email template WITH the founder — it must sound like a person, not a pipeline; that's the whole point of the rescue."
   },
   {
    "step": 2,
    "tool": "Make",
    "detail": "Intake scenario: **Custom Webhook** `nps-in`, teach it with a sample POST (`response_id`, `email`, `account`, `plan`, `score`, `comment`). First module after: **Data store: Get a record** on `seen_responses` with Key = `{{1.response_id}}` → filter: record does NOT exist → **Data store: Add/replace a record** to mark it seen. Survey tools retry webhooks; without this gate every retry double-counts the week's NPS."
   },
   {
    "step": 3,
    "tool": "Make",
    "detail": "Log first, route second: **Google Sheets: Add a Row** to `Responses` with `segment` = `{{if(1.score >= 9; \"promoter\"; if(1.score >= 7; \"passive\"; \"detractor\"))}}`. Logging before the Router means the trend data is complete even if a downstream email fails."
   },
   {
    "step": 4,
    "tool": "Make",
    "detail": "**Router**, three routes on `score` with numeric operators. Route `Detractor` (score ≤ 6): **Telegram Bot: Send a Text Message or a Reply** to the team chat — `🔴 NPS {{1.score}} from {{1.account}} ({{1.plan}}): \"{{substring(1.comment; 0; 200)}}\"` → **Google Sheets: Add a Row** to `Rescue Tasks` with `owner` = the CS lead, `status` = `open`, `due` = `{{formatDate(addDays(now; 1); \"YYYY-MM-DD\")}}` → **Gmail: Send an Email** from the founder's connected account using the agreed template, referencing their comment when present (`{{if(length(1.comment) > 0; ...; ...)}}` for a comment-less variant)."
   },
   {
    "step": 5,
    "tool": "Make",
    "detail": "Route `Passive` (score 7-8): **Gmail: Send an Email** — the tips email: three genuinely useful workflows in the product, no ask, no coupon. Route `Promoter` (score ≥ 9): a nested **Router** on plan — top-plan accounts get the referral invite email, everyone else gets the G2 review ask with a direct link. Send promoter emails with a 'thanks — 60 seconds, one favor' tone."
   },
   {
    "step": 6,
    "tool": "Make",
    "detail": "Attach an error handler with **Ignore** plus a Telegram alert to each Gmail module — a bounced or failed send must not kill the run (the response is already logged and the task row already exists for detractors). Finish the webhook scenario with **Webhooks: Webhook Response** 200 so the survey tool doesn't retry successful deliveries."
   },
   {
    "step": 7,
    "tool": "Make",
    "detail": "Weekly rollup scenario, scheduled Mondays 07:00: three **Google Sheets: Search Rows** calls on `Responses` filtered to the last 7 days (`date` ≥ `{{formatDate(addDays(now; -7); \"YYYY-MM-DD\")}}`) — one per segment, using each search's total-count output rather than iterating rows → **Tools: Set variable** `nps` = `{{round((promoters - detractors) / responses * 100)}}` (guard the zero-response week: `{{if(responses = 0; \"n/a\"; ...)}}`) → **Google Sheets: Add a Row** to `NPS Trend` → **Telegram Bot: Send a Text Message or a Reply**: `📊 Week of {{week_start}}: NPS {{nps}} ({{responses}} responses, {{detractors}} detractors — {{open_tasks}} rescue tasks open)`."
   },
   {
    "step": 8,
    "tool": "Make",
    "detail": "Rescue-task nag, same Monday scenario: **Google Sheets: Search Rows** on `Rescue Tasks` where `status` = `open` AND `due` before today → **Text Aggregator** one line per overdue task → append to the Monday Telegram message. An unowned rescue list rots in a week; the nag is what keeps the loop honest."
   },
   {
    "step": 9,
    "tool": "Test",
    "detail": "POST six synthetic responses to the **Custom Webhook** (Run once before each): scores 2 (with comment), 5 (no comment), 7, 8, 9 (basic plan), 10 (top plan). Verify: 6 `Responses` rows with correct segments; 2 Telegram alerts and 2 rescue tasks; founder email renders correctly both with and without a comment; tips email × 2; review ask and referral invite land correctly by plan. Re-POST the score-2 payload with the same response_id — provably nothing happens. Run the Monday rollup: NPS should compute to `round((2-2)/6*100)` = 0 and append one trend row."
   }
  ],
  "dataModel": [
   "Sheet `Responses`: response_id, date, email, account, plan, score (0-10), comment, segment (promoter/passive/detractor)",
   "Sheet `Rescue Tasks`: date, email, account, score, comment, owner, status (open/done), due",
   "Sheet `NPS Trend`: week_start, responses, promoters, passives, detractors, nps",
   "Data store `seen_responses`: key = response_id; fields: received_at (Date) — the webhook-retry dedupe gate"
  ],
  "edgeCases": [
   "Webhook retries from the survey tool: the seen_responses gate must run before ANY side effect — test by re-POSTing an identical payload and asserting zero new rows, emails, or alerts",
   "Empty or missing comment: the detractor email template needs a graceful no-comment variant; an email quoting a blank string reads as broken automation, the opposite of a personal rescue",
   "Zero-response week: the NPS formula divides by response count — guard it or the Monday rollup errors on a quiet week",
   "Malformed payload (missing score or non-numeric score): a leading filter routes it to a Telegram 'bad payload' alert instead of mis-segmenting it as a detractor",
   "Founder-email deliverability: sending 'from the founder' via an automation must use the founder's actual connected Gmail, reply-to intact — a no-reply rescue email does more harm than silence"
  ],
  "acceptance": [
   "A detractor response produces a Telegram alert, a rescue task with owner and due date, and a founder-toned email — all within 5 minutes of the webhook POST",
   "All six synthetic test scores route to the correct segment actions, including the plan split for promoters",
   "Replaying any response_id causes zero duplicate rows, emails, alerts, or NPS distortion",
   "The Monday rollup appends one trend row whose NPS matches a hand calculation from the `Responses` tab, and lists overdue rescue tasks",
   "A failed email send still leaves the response logged and (for detractors) the task created, with a failure alert in Telegram",
   "Four consecutive weekly trend rows accumulate without manual intervention"
  ],
  "portfolio": [
   "Loom the detractor rescue as a story: POST a score-2 with an angry comment, show the Telegram alert land, open the founder email, show the task row — under 3 minutes",
   "Export both blueprints and screenshot the three-way Router with numeric filters open plus a populated NPS Trend tab with a real-looking line",
   "Frame honestly: demonstration build with synthetic responses and a simulated survey webhook — note that Typeform/Delighted-style tools plug into the same intake unchanged",
   "Lead the case study with the business number: same-hour detractor response vs weeks-later discovery, anchored to the (client-stated, not invented) cost of a churned account"
  ],
  "stretch": [
   "Enrich detractor alerts with account context: an Airtable or CRM lookup adds ARR and renewal date to the Telegram alert so the team can triage by revenue at risk",
   "Add a 14-day detractor follow-up: a scheduled sweep re-emails rescued accounts with a one-question 'did we fix it?' micro-survey and logs the delta",
   "Publish the NPS trend as an auto-updating chart the team can see, generated weekly from the trend tab"
  ]
 },
 {
  "id": "c16",
  "title": "Salon Missed-Call Money Recovery",
  "industry": "salon",
  "stack": "ghl",
  "difficulty": "intermediate",
  "hours": "3-5 h",
  "brief": [
   "I run a one-chair salon and I'm behind the chair with my hands in someone's hair for most of the day — I physically cannot answer the phone. My call log says I miss around 30 calls a week, and maybe 5 of those people ever call back. At an average ticket of $65, that's real money walking to the salon down the street just because they picked up first.",
   "After I close at 7pm the phone keeps ringing too — people getting off work want to book for the weekend, and by the time I text them back the next morning half of them have already booked somewhere else. I also get maybe 4 or 5 no-shows a week on my booking calendar, and every empty slot is an hour I can't get back.",
   "I don't want an app I have to babysit. I want anyone who calls and doesn't reach me to instantly get a text with my booking link, I want people reminded before their appointment, and I'd love a quick weekly number telling me how many calls I missed and how many turned into bookings."
  ],
  "painPoints": [
   "~30 missed calls/week with almost no callbacks — callers just book with whoever answers first",
   "After-hours callers (evenings and Sundays) get silence until the next morning and go elsewhere",
   "4-5 no-shows a week on the booking calendar, with no recovery message to refill the slot",
   "Zero visibility: the owner has no idea how many calls she misses or what it costs her"
  ],
  "whyStack": "This is GHL native end to end. Missed Call Text Back is a built-in setting on the sub-account phone number — no workflow required for the core fix. The booking side is the native Calendar with Appointment Reminder workflows, the no-show recovery hangs off the built-in Appointment Status trigger, and the missed-call count comes straight off the native Reports/Dashboard call reporting. There is no external system, no data transformation, and no API in sight — wiring in n8n or Make here would be over-engineering: you'd be paying for and maintaining a second platform to do things GHL ships as checkboxes. The honest architecture pitch is 'one login, zero middleware.'",
  "guide": [
   {
    "step": 1,
    "tool": "Setup",
    "detail": "In the sub-account, confirm a phone number exists under **Settings → Phone Numbers** and start **A2P 10DLC registration** immediately — nothing SMS-based reliably delivers without it. Create the calendar **Salon Appointments** under **Calendars** with the owner's real working hours, and a **Bookings** pipeline with stages `New Booking`, `Reminded`, `Showed`, `No-Show`, `Recovered`."
   },
   {
    "step": 2,
    "tool": "GHL",
    "detail": "Enable **Missed Call Text Back** (under **Settings → Phone Numbers → edit number**, or the card in **Settings → Business Profile** depending on UI version). Message: sorry-we-missed-you + the **Salon Appointments** permanent booking link, merge `{{contact.first_name}}` when known. This one toggle is the money recovery."
   },
   {
    "step": 3,
    "tool": "GHL",
    "detail": "Build workflow **\"After-Hours Reply\"**: trigger **Customer Replied** (channel filter: SMS), action **If/Else** on current time using the workflow's business-hours awareness — simplest native pattern: set the workflow **time window** to the CLOSED hours (19:00-09:00) so it only processes then — action **Send SMS**: \"We're closed right now, but you can grab a slot anytime: [booking link].\" Turn **Allow Re-Entry** ON so repeat callers always get an answer."
   },
   {
    "step": 4,
    "tool": "GHL",
    "detail": "Build workflow **\"Booking Confirmation + Reminders\"**: trigger **Customer Booked Appointment** filtered to calendar **Salon Appointments**. Actions: **Send SMS** confirmation immediately, then **Wait → Event/Appointment Time → 24 hours before** → **Send SMS** reminder, then **Wait → Event/Appointment Time → 2 hours before** → **Send SMS** final reminder with \"reply C to confirm\". Add **Add Contact Tag** `booked` and **Create Opportunity** in **Bookings → New Booking**."
   },
   {
    "step": 5,
    "tool": "GHL",
    "detail": "Build workflow **\"No-Show Recovery\"**: trigger **Appointment Status** with filter `status is No-Show` on calendar **Salon Appointments**. Actions: **Send SMS** (\"Life happens! Want to grab a new time? [booking link]\"), **Wait → 2 days**, **If/Else** on `Tags includes` `rebooked` (stamped by a tiny helper workflow: trigger **Customer Booked Appointment** → **Add Contact Tag** `rebooked`) — Else branch sends one final **Send Email** nudge. Move the opportunity with **Create/Update Opportunity** → stage `No-Show`, then `Recovered` on the rebook path."
   },
   {
    "step": 6,
    "tool": "GHL",
    "detail": "Weekly report: open **Reporting → Call Reporting** (or the **Dashboard** call widget) and confirm missed/answered call counts display per week. Then build workflow **\"Weekly Missed-Call Report\"**: trigger — no native scheduled trigger fires weekly on its own, so document the pro pattern: a recurring **task** or the dashboard itself is the report; the deliverable to the owner is a saved **Dashboard** view plus a Monday **Send Internal Notification** habit. Frame honestly: the dashboard IS the report."
   },
   {
    "step": 7,
    "tool": "Test",
    "detail": "Call the GHL number from your own phone and hang up — verify the **Missed Call Text Back** SMS appears in **Conversations** (screenshot the attempt if A2P still blocks delivery). Book a test appointment as `Nadia Noshow` and walk the confirmation + both reminders in **Execution Logs** using compressed waits, then mark the appointment **No-Show** and verify the recovery SMS fires and the opportunity card moves to `No-Show`."
   },
   {
    "step": 8,
    "tool": "Test",
    "detail": "Rebook as the same test contact and confirm the helper stamps `rebooked`, the If/Else takes the recovered branch, and the **Bookings** pipeline card lands in `Recovered`. Restore production waits, set every workflow to **Publish**, and screenshot the dashboard's missed-call count for the weekly report evidence."
   }
  ],
  "dataModel": [
   "Pipeline: Bookings — stages New Booking, Reminded, Showed, No-Show, Recovered",
   "Calendar: Salon Appointments (owner's real hours, 15-min buffer between slots)",
   "Custom field: Preferred Service (dropdown: cut, color, blowout, other)",
   "Tags: booked, rebooked, missed-call, no-show",
   "Custom value: booking_link (so the URL lives in ONE place across all messages)"
  ],
  "edgeCases": [
   "A2P 10DLC must be registered before any SMS goes to the public — build first, but make registration the Day-1 client onboarding task and say so",
   "Opt-outs: honor **DND** — every SMS path must respect a STOP reply; never message a contact GHL has flagged DND",
   "Re-entry: After-Hours Reply needs **Allow Re-Entry ON** (people call twice); No-Show Recovery should be re-enterable too — a client can no-show more than once",
   "Time windows: reminders can send anytime relative to the appointment, but the recovery and nudge messages should respect a 9:00-19:00 send window so nobody gets texted at 6am"
  ],
  "acceptance": [
   "A missed call to the salon number produces an outbound text-back visible in Conversations within 60 seconds",
   "An after-hours inbound SMS gets the auto-reply with a working booking link; the same message during open hours does NOT trigger it",
   "A test booking receives confirmation + 24h + 2h reminders, verified step-by-step in Execution Logs",
   "Marking an appointment No-Show fires the recovery SMS and moves the pipeline card to No-Show; rebooking moves it to Recovered with no duplicate cards",
   "The dashboard call widget shows an accurate weekly missed-call count matching the test calls placed"
  ],
  "portfolio": [
   "Record a 3-4 minute Loom: open with the math (30 missed calls x $65 average ticket), then show the Missed Call Text Back setting, the workflow canvases, and one real Execution Log",
   "Frame it honestly as a demonstration build on a fictional salon — no invented client results; the pitch is the mechanism and the math, not fabricated revenue",
   "Include a before/after screenshot pair: the empty Conversations thread from a hang-up call, then the auto-text that follows it — that single image sells the whole system"
  ],
  "stretch": [
   "Add a review-request follow-up: trigger **Appointment Status** = Showed → 3 hours later, send the Google review link with a private-feedback alternative",
   "Add a waitlist blast: when a No-Show frees a same-day slot, bulk-SMS a `waitlist` Smart List with the open time"
  ]
 },
 {
  "id": "c17",
  "title": "Dental 5-Star Review Engine",
  "industry": "dental office",
  "stack": "ghl",
  "difficulty": "intermediate",
  "hours": "4-6 h",
  "brief": [
   "We're a two-dentist practice seeing about 45 patients a day, and our front desk is supposed to ask people to leave a Google review at checkout. In practice it happens maybe twice a week — the desk is slammed. We have 87 Google reviews after eleven years; the newer practice across the road has 400 and they show up above us on the map for every search that matters.",
   "When we do get reviews, they're great — we genuinely take care of people. The problem is nobody asks. And on the rare occasion someone had a rough visit (a long wait, an insurance surprise), we'd rather hear about it directly and fix it than read about it on Google a week later. To be clear, we're not asking you to hide bad reviews — our office manager already told us that's against Google's rules and we believe her.",
   "What we want: every patient who actually showed up gets a friendly review ask a few hours after their visit, one polite follow-up if they don't act, an easy private way to tell us if something went wrong, and a simple monthly count of asks sent versus reviews that came in so we know it's working."
  ],
  "painPoints": [
   "~45 shows/day but review asks only happen when the front desk remembers — roughly 2 asks a week out of 200+ opportunities",
   "87 reviews vs a competitor's 400 means losing the Google Maps pack, which is where new patients actually choose",
   "Unhappy patients have no easy private channel, so the first the practice hears of a problem is a public 2-star review",
   "No tracking at all: nobody can say how many asks went out or what the conversion to reviews is"
  ],
  "whyStack": "Everything this practice needs is inside one GHL sub-account: the Appointment Status trigger fires the ask off real visit data, Send Email/Send SMS handle the two touches, the native Reputation module manages the review link (and pulls reviews in once Google Business Profile is connected under Settings → Integrations), a native Form is the private feedback channel, and a plain pipeline plus the Reputation → Requests screen give you the monthly numbers. There's no external data source, no transformation, and no third-party API — bolting on n8n or Make would be over-engineering, adding a second point of failure to a job that's literally two messages, a form, and a dashboard the platform already ships.",
  "guide": [
   {
    "step": 1,
    "tool": "Setup",
    "detail": "Connect **Google Business Profile** under **Settings → Integrations** (for the fictional demo, note it as a placeholder and journal 'swap for the client's real GBP at onboarding'). Set the **Review Link** under **Settings → Reputation Management**, confirm **A2P 10DLC registration** status before any patient-facing SMS, and verify the practice calendar's appointment statuses are actually being set to Showed by the front desk — the whole engine keys off that."
   },
   {
    "step": 2,
    "tool": "GHL",
    "detail": "Build the private channel: **Sites → Forms → Builder → + Add Form** → **\"Private Feedback\"** with name, email, and one long-text field `How was your visit? What could we do better?`. Then a catcher workflow: trigger **Form Submitted** filtered to **Private Feedback** → **Send Internal Notification** (email + in-app) to the office manager → **Add Contact Tag** `private-feedback` → **Create Opportunity** in **Review Engine → Feedback Received**."
   },
   {
    "step": 3,
    "tool": "GHL",
    "detail": "Build workflow **\"Review Request\"**: trigger **Appointment Status** with filter `status is Showed` on the practice calendar. Action 1: **Wait → 3 hours** (same-day while fresh, not creepy-instant). Action 2: **Send Email** — the ask, with BOTH links visible to everyone: the public **review link** and the **Private Feedback** form link. Action 3: **Send SMS** version of the same ask. This is the compliant pattern: everyone gets the public review link; the private route is an addition, never a diversion."
   },
   {
    "step": 4,
    "tool": "GHL",
    "detail": "The polite second ask: **Wait → 3 days**, then **If/Else** — Branch `Engaged`: email-activity condition (**clicked** the review email link) if the condition panel offers it, otherwise `Tags includes` `replied` via a helper workflow (trigger **Customer Replied** → **Add Contact Tag** `replied`, **Allow Re-Entry ON**). Engaged branch: **Send Email** thank-you. Else branch: **Send Email** \"one small favor?\" — both links again, and explicitly the last ask. Both branches end with **Add Contact Tag** `review-requested`."
   },
   {
    "step": 5,
    "tool": "GHL",
    "detail": "Tracking pipeline: create pipeline **Review Engine** with stages `Ask Sent`, `Engaged`, `Review Confirmed`, `Feedback Received`. In the Review Request workflow add **Create Opportunity** → `Ask Sent` right after the first email, and **Create/Update Opportunity** → `Engaged` on the Engaged branch. `Review Confirmed` is moved manually by the office manager when a new review appears under **Reputation → Reviews** — say out loud that GHL can't auto-match an anonymous Google review to a contact; honest builders don't pretend it can."
   },
   {
    "step": 6,
    "tool": "GHL",
    "detail": "Workflow settings pass: **Allow Re-Entry OFF** with a documented nuance (don't re-ask after every hygiene visit; a mature build re-allows after 6 months), **Stop on Response ON** (a reply means a human conversation — the second ask must not fire into it), send window **9:00-19:00**. **Publish + Save**."
   },
   {
    "step": 7,
    "tool": "GHL",
    "detail": "Monthly count report: the sent side comes from **Reputation → Requests** (every invite + status) plus the **Review Engine** pipeline counts; the received side from **Reputation → Overview** once GBP is connected. Package it as a saved **Dashboard** view the office manager checks on the 1st — asks sent, engaged, reviews in — no external reporting tool needed."
   },
   {
    "step": 8,
    "tool": "Test",
    "detail": "Create `Rita Reviewer` (your alias email, your phone), book and mark her appointment **Showed**, compress the waits to 2-3 minutes, and verify in **Execution Logs**: ask email with both working links → no click → second ask fires → `review-requested` tag lands → opportunity sits in `Ask Sent`. Run a second contact who clicks the review link and confirm the Engaged branch and pipeline move."
   },
   {
    "step": 9,
    "tool": "Test",
    "detail": "Submit the **Private Feedback** form as a third test contact and verify the internal notification arrives, the `private-feedback` tag lands, and a `Feedback Received` card appears. Restore production waits (3 hours / 3 days), re-save, and screenshot the canvas, one full execution log, the pipeline board, and the Reputation → Requests screen."
   }
  ],
  "dataModel": [
   "Pipeline: Review Engine — stages Ask Sent, Engaged, Review Confirmed, Feedback Received",
   "Form: Private Feedback (name, email, long-text 'How was your visit?')",
   "Tags: review-requested, replied, private-feedback",
   "Custom field: Last Visit Date (date) — supports the 6-month re-ask rule later",
   "Reputation settings: Review Link (GBP short-link), Google Business Profile integration"
  ],
  "edgeCases": [
   "No review gating — ever. Everyone gets the public review link; the private form is offered alongside it, not instead of it. Filtering by follow-up emphasis is legal; blocking access is not",
   "A2P 10DLC registration must be complete before the SMS leg goes live to real patients; until then the email leg carries the system",
   "DND/opt-out: any STOP reply or DND flag must halt both touches — Stop on Response ON plus GHL's native DND handling covers it, but test it explicitly",
   "Re-entry: with Re-Entry OFF, a patient with two visits in a week gets asked once — correct behavior, but document the 6-month re-ask design for the real build"
  ],
  "acceptance": [
   "Marking a test appointment Showed produces the ask email + SMS ~3 hours later (compressed in test), with both the review link and private feedback link present and working in every ask message",
   "A non-engager receives exactly one polite second ask after 3 days and then nothing further; an engager gets the thank-you and never the second ask — both verified in Execution Logs",
   "A Private Feedback submission notifies the office manager within a minute and creates a Feedback Received pipeline card",
   "Reputation → Requests lists every test invite with status, and the Review Engine pipeline counts match the test contacts exactly",
   "A patient who replies to the ask is removed from the sequence (Stop on Response) — verified with a test reply"
  ],
  "portfolio": [
   "Lead the Loom with the compliance point — 'no review gating, here's the compliant pattern' — before showing the canvas; it's the strongest hiring signal in the whole build",
   "Show the math honestly: ~200 shows/week x an industry-typical single-digit response rate still beats 2 manual asks a week, without inventing a specific result",
   "Screenshot set: workflow canvas, one expanded Execution Log, the Review Engine pipeline board, and the Reputation → Requests screen — the four images that prove it runs"
  ],
  "stretch": [
   "Add AI review replies: enable the Reputation module's review auto-reply settings so every new Google review gets a draft response for the office manager to approve",
   "Segment the ask by visit type with a calendar filter — hygiene visits get the standard ask, big-procedure patients get a warmer, longer email from the dentist's name"
  ]
 },
 {
  "id": "c18",
  "title": "Law-Firm Consult No-Show Eliminator",
  "industry": "law firm",
  "stack": "ghl",
  "difficulty": "intermediate",
  "hours": "4-6 h",
  "brief": [
   "I'm the managing partner of a three-attorney family-law firm. We book around 25 initial consultations a week through our website, and roughly 40% of them simply don't show up. Each consult slot is an hour of attorney time — at our billing rates that's thousands of dollars of dead calendar every single week, and my associates are starting to treat consult slots as optional because half of them evaporate.",
   "Part of the problem is ours: after someone books, they hear nothing from us until the appointment. No confirmation beyond the calendar's default, no reminder, and nobody tells them to bring their financial documents — so even the ones who DO show often arrive empty-handed and we lose half the consult to paperwork we could have collected up front.",
   "I want booked consults confirmed immediately with a document checklist, a proper reminder sequence leading up to the appointment, an instant reschedule path when someone cancels or no-shows instead of just losing them, my paralegal automatically assigned a prep task for every consult, and a way to actually see our show rate so I know if this is working."
  ],
  "painPoints": [
   "40% of ~25 weekly consults no-show — attorney hours die on the calendar with no recovery attempt",
   "Zero client communication between booking and appointment: no confirmation, no reminders, no expectations set",
   "Clients who do show arrive without financial documents, burning half the consult on intake",
   "Cancellations and no-shows are dead ends — nobody sends a reschedule link — and the firm has no show-rate number to manage against"
  ],
  "whyStack": "This entire system lives on GHL's native appointment engine: the Customer Booked Appointment trigger, Wait steps set to before-appointment-time offsets, Send Email/Send SMS, the Appointment Status trigger for Cancelled and No-Show paths, the native Add Task action for the paralegal, and a pipeline whose stages ARE the show-rate report. Every trigger this build needs fires on data GHL itself owns — the calendar. Routing calendar events out to n8n or Make and back in again would be over-engineering in its purest form: extra latency, extra credentials, extra failure modes, zero added capability. The right architecture is the boring one: one sub-account, four workflows, one pipeline.",
  "guide": [
   {
    "step": 1,
    "tool": "Setup",
    "detail": "Create calendar **Initial Consultation** under **Calendars** (60-min slots, attorney round-robin if the plan allows, buffer time between consults). Create pipeline **Consultations** with stages `Booked`, `Confirmed`, `Reminded`, `Showed`, `No-Show`, `Rescheduled`, `Lost`. Add custom fields `Case Type` (dropdown) and `Documents Confirmed` (checkbox). Confirm **A2P 10DLC registration** before the SMS legs go live, and store the calendar's permanent link as custom value `consult_booking_link`."
   },
   {
    "step": 2,
    "tool": "GHL",
    "detail": "Workflow **\"Consult Confirmation\"**: trigger **Customer Booked Appointment** filtered to calendar **Initial Consultation**. Actions: **Send Email** — confirmation + the document checklist (photo ID, last 2 years' tax returns, pay stubs, any existing court orders) written as a scannable list; **Send SMS** short confirmation; **Create Opportunity** in **Consultations → Booked**; **Add Task** assigned to the paralegal — `Prep consult file: {{contact.name}}, {{appointment.start_time}}` with a due date before the consult; **Send Internal Notification** to the assigned attorney."
   },
   {
    "step": 3,
    "tool": "GHL",
    "detail": "The reminder ladder, in the same workflow, using appointment-anchored waits: **Wait → Event/Appointment Time → 3 days before** → **Send Email** reminder restating the document checklist → **Wait Until appointment time minus 24 hours** → **Send SMS** \"reply C to confirm\" → **Wait Until appointment time minus 2 hours** → **Send SMS** final reminder with office address and parking note. After the 24-h touch, add **If/Else** on `Tags includes` `consult-confirmed` (helper workflow: trigger **Customer Replied**, filter `reply contains` C → **Add Contact Tag** `consult-confirmed`) and move the opportunity to `Confirmed` via **Create/Update Opportunity**."
   },
   {
    "step": 4,
    "tool": "GHL",
    "detail": "Workflow **\"Cancel → Reschedule\"**: trigger **Appointment Status** filter `status is Cancelled` on **Initial Consultation**. Actions: **Send Email** + **Send SMS** with the reschedule link (`consult_booking_link`) framed as \"grab a new time that works\", **Create/Update Opportunity** → `Rescheduled` holding stage, **Wait → 3 days**, **If/Else** on `Tags includes` `rebooked` (helper: **Customer Booked Appointment** → **Add Contact Tag** `rebooked`) — Else: one final **Send Email** nudge, then **Create/Update Opportunity** → `Lost`."
   },
   {
    "step": 5,
    "tool": "GHL",
    "detail": "Workflow **\"No-Show Recovery\"**: trigger **Appointment Status** filter `status is No-Show`. Actions: **Send SMS** within the send window — empathetic, zero guilt: \"We had you down for today and missed you — want to pick a new time? [link]\"; **Send Email** version with the document checklist re-attached; **Create/Update Opportunity** → `No-Show`; **Add Task** for the paralegal: `Call no-show: {{contact.name}}` due next business day; same 3-day **If/Else** on `rebooked` → `Rescheduled` or `Lost`."
   },
   {
    "step": 6,
    "tool": "GHL",
    "detail": "Show-rate tracking: workflow **\"Consult Showed\"** — trigger **Appointment Status** filter `status is Showed` → **Create/Update Opportunity** → `Showed` → **Add Contact Tag** `consulted`. Now the **Consultations** pipeline IS the report: show rate = `Showed` cards / (`Showed` + `No-Show` + `Lost`) per period, read straight off the pipeline board or **Reporting → Appointment Report**. No spreadsheet, no external BI."
   },
   {
    "step": 7,
    "tool": "GHL",
    "detail": "Settings pass on all four workflows: **Allow Re-Entry ON** everywhere (the same person can book, cancel, and rebook — every event must process), **Stop on Response OFF** on the reminder ladder (replies are handled by the `consult-confirmed` helper; Stop on Response would yank confirmers out before their 2-hour reminder), send window **8:00-20:00** on recovery/nudge messages but leave the appointment-anchored reminders unwindowed so the 2-hour touch always lands. **Publish + Save** all four."
   },
   {
    "step": 8,
    "tool": "Test",
    "detail": "Book `Nora Noshow` through the real public calendar link in an incognito window. Verify the instant layer: confirmation email with checklist, SMS, `Booked` opportunity, paralegal **Task** visible on the contact, attorney notification. With a near-term test appointment, watch the appointment-anchored reminders fire at their offsets in **Execution Logs**; reply C from her number and confirm the `consult-confirmed` tag and the `Confirmed` stage move."
   },
   {
    "step": 9,
    "tool": "Test",
    "detail": "Mark one test appointment **Cancelled** and another **No-Show**; verify each recovery path: reschedule messages sent, correct pipeline stages, paralegal call task created. Rebook one of them and confirm `rebooked` routes to `Rescheduled` not `Lost`. Screenshot all four canvases, one full log per path, the pipeline board showing every stage populated, and the task list — then compute the demo show rate from the board on camera in your Loom."
   }
  ],
  "dataModel": [
   "Pipeline: Consultations — stages Booked, Confirmed, Reminded, Showed, No-Show, Rescheduled, Lost",
   "Calendar: Initial Consultation (60-min slots, round-robin across attorneys, buffers)",
   "Custom fields: Case Type (dropdown: divorce, custody, support, other), Documents Confirmed (checkbox)",
   "Tags: consult-confirmed, rebooked, consulted",
   "Custom value: consult_booking_link; Tasks assigned to the paralegal user via Add Task"
  ],
  "edgeCases": [
   "A2P 10DLC registration is a prerequisite for every SMS touch — the email ladder must be able to carry the system alone until it clears",
   "DND/opt-out: a STOP reply must silence all four workflows for that contact; test that a DND contact still gets email but never SMS",
   "Re-entry: all workflows need **Allow Re-Entry ON** — book/cancel/rebook cycles are the norm here, and a no-show can no-show again",
   "Same-week rebooking: a client who cancels and instantly rebooks must not sit in `Lost` — the `rebooked` helper tag has to be checked before any Lost move, and the confirmation workflow re-fires cleanly for the new appointment"
  ],
  "acceptance": [
   "A live test booking through the public calendar produces confirmation email (with document checklist) + SMS + Booked opportunity + paralegal task + attorney notification, all within 2 minutes",
   "Reminders fire at 3 days, 24 hours, and 2 hours before the appointment time, verified against the appointment-anchored waits in Execution Logs",
   "Replying C moves the contact to Confirmed and stamps consult-confirmed; a Cancelled appointment triggers the reschedule message within 5 minutes",
   "A No-Show gets the recovery SMS + email and a next-business-day paralegal call task; rebooking lands the card in Rescheduled, never Lost",
   "The Consultations pipeline yields a computable show rate that matches the test scenario counts exactly (e.g. 1 Showed, 1 No-Show, 1 Rescheduled)"
  ],
  "portfolio": [
   "Open the Loom with the dead-calendar math: 25 consults x 40% no-show x 1 attorney-hour — then present the pipeline board as the show-rate dashboard the partner asked for",
   "Frame it as a demonstration build on a fictional firm; the honest claim is 'reminder ladders of this shape are the standard fix for no-shows' — never a fabricated before/after percentage",
   "Show one complete client journey end-to-end in the Execution Logs — booked → reminded → confirmed → showed — rather than four disconnected canvases; reviewers hire people who can trace a run"
  ],
  "stretch": [
   "Add a document-upload step: a GHL form or the client portal to collect the checklist files before the consult, flipping `Documents Confirmed` and notifying the paralegal when files land",
   "Add a post-consult path: trigger on Showed → 1 day later, engagement-letter follow-up email and a `Signed` extension to the pipeline"
  ]
 }
];

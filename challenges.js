// Portfolio Lab - real-client challenge briefs with architecture guides
// c01-c18: architecture-level guides; c19-c30: full-combo systems with step-by-step solutions (phases A/B/C)
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
 },
 {
  "id": "c19",
  "title": "Dental Clinic Growth System",
  "industry": "Dental / Healthcare",
  "stack": "ghl",
  "difficulty": "advanced",
  "hours": "10-14 h",
  "brief": [
   "I run a two-chair dental practice and honestly, we're leaking patients at every stage. We get maybe 40 new-patient inquiries a month from our website and Google, but the front desk calls them back whenever they get a spare minute — sometimes the next day. By then half of them booked with the clinic across the street.",
   "Then there are the no-shows. We lose 15-20 booked exams a month to people who just don't turn up, and nobody chases them. And we have around 1,800 past patients in a spreadsheet who haven't been in for a cleaning in over a year — that's a goldmine nobody is mining.",
   "I want the whole thing built as one system: a proper patient CRM so I can see where every person is, a landing page for our $99 new-patient exam special, online booking, and automation that confirms, reminds, chases no-shows, asks for reviews, and pulls old patients back in every six months. One login, one system, and my front desk just handles the phone calls it tells them to make.",
   "Volumes to design for: ~40 new inquiries/month, ~120 appointments/month across hygiene and exams, ~1,800 past patients to reactivate over time."
  ],
  "painPoints": [
   "New web leads wait hours (sometimes a day) for a callback and book elsewhere",
   "15-20 no-shows a month with zero recovery process",
   "1,800 lapsed patients sitting in a spreadsheet with no recall system",
   "No online booking — everything goes through the front desk phone",
   "Only 30 Google reviews after 12 years because nobody ever asks"
  ],
  "whyStack": "Every layer of this system is a native GHL feature: Opportunities gives you the New Patient and Recall pipelines, Custom Fields store `Insurance Provider` and `Last Visit`, Calendars handles online exam booking with confirmations, Funnels builds the $99 special landing page with an embedded Form, and Workflows covers speed-to-lead, appointment reminders (with appointment-anchored Waits), no-show recovery, review requests, and the 6-month recall via the Contact Date Reminder trigger. Reputation Management sends the review requests to Google. Nothing here needs Zapier, Make, or an external booking tool — that single-platform pitch is exactly why clinics buy GHL.",
  "guide": [
   {
    "step": "A1 — CRM: build the two pipelines",
    "tool": "GHL",
    "detail": "In the sub-account, left sidebar → **Opportunities** → **Pipelines** (or **Settings** → **Pipelines**) → **+ Create new pipeline**. Name it `New Patient` and add stages in order: `New Inquiry`, `Contacted`, `Exam Booked`, `Showed`, `Treatment Planned`, `Won`, `Lost` — click **+ Add Stage** for each, then **Save**. Create a second pipeline named `Recall` with stages `Due`, `Reminded`, `Rebooked`, `Lapsed`. Toggle **Visible in Pie/Funnel charts** on for both so the dashboard reports on them."
   },
   {
    "step": "A2 — CRM: custom fields with types",
    "tool": "GHL",
    "detail": "Go to **Settings** → **Custom Fields** → **+ Add Field**. Create `Insurance Provider` as type **Dropdown (Single)** with options `Delta Dental`, `Cigna`, `MetLife`, `Self-Pay`, `Other`, placed in a folder called `Patient Info`. Create `Last Visit` as type **Date** — this field is the anchor for the entire recall engine, so spell it exactly the same everywhere. Add `Preferred Hygienist` as type **Single Line** (text). Click **Save** after each field."
   },
   {
    "step": "A3 — CRM: tag vocabulary",
    "tool": "GHL",
    "detail": "Open **Settings** → **Tags** → **+ New Tag** and create the full set up front so workflows never invent near-duplicates: `new-lead`, `exam-booked`, `showed`, `no-show-recovery`, `review-requested`, `recall-due`, `reactivated`, `replied`. Tags are lowercase-with-hyphens by convention; write the list in your build doc because every workflow in Phase C references them by exact name."
   },
   {
    "step": "A4 — CRM: the New Patient Exam calendar",
    "tool": "GHL",
    "detail": "Go to **Calendars** → **Calendar Settings** → **+ Create Calendar** → choose a simple **Round Robin** or personal booking calendar. Name it `New Patient Exam`, slug `new-patient-exam`, duration **40 minutes**, buffer **10 minutes** after each slot, availability Mon-Fri **8:00 AM - 4:20 PM**. Under the confirmation options, set new bookings to land as **Confirmed** (auto-confirm) — the Phase C reminder workflow triggers on that status. In **Forms & Payment**, keep the default form but require phone number. **Save**."
   },
   {
    "step": "A5 — Setup: staff, phone number and A2P reality check",
    "tool": "Setup",
    "detail": "In **Settings** → **My Staff**, confirm the front-desk user exists and is available for internal notifications. In **Settings** → **Phone Numbers**, confirm a number is claimed (click **+ Add Number** if not). Write the A2P caveat into your build doc now: until **A2P 10DLC registration** is approved, SMS to the public will not reliably deliver — build every SMS step for real, test to your own verified phone, and lean on email as your provable evidence. For a real clinic, A2P registration is a day-one onboarding task."
   },
   {
    "step": "B1 — Funnel: create the $99 exam special funnel shell",
    "tool": "GHL",
    "detail": "Left sidebar → **Sites** → **Funnels** → **+ New Funnel** → **From Blank**, name it `$99 New Patient Special`. Add three steps with **+ Add New Step**: `Offer Page` (path `/99-exam`), `Book Your Exam` (path `/book`), `Thank You` (path `/thanks`). Section outline for the Offer Page before you build: hero (headline + $99 offer + CTA button), what's-included list (exam, x-rays, cleaning consult), meet-the-dentist section, 3 testimonials placeholder section clearly labeled as placeholder content, FAQ, footer with the inquiry form."
   },
   {
    "step": "B2 — Funnel: build the inquiry form and map every field",
    "tool": "GHL",
    "detail": "Go to **Sites** → **Forms** → **Builder** → **+ Add Form**, name it `$99 Exam Inquiry`. Drag on **First Name**, **Last Name**, **Phone**, **Email**, then drag a **Custom Field** element and map it to `Insurance Provider` (it renders as the dropdown you built in A2). Every element must map to a real contact field — check the field picker on each one; unmapped fields silently discard data. In form **Options**, set On Submit → **Redirect to URL** → the `/book` step URL so submitting flows straight into booking. **Save Form**, then in the funnel editor drop a **Form** element into the Offer Page footer section and select `$99 Exam Inquiry`."
   },
   {
    "step": "B3 — Funnel: booking page with embedded calendar",
    "tool": "GHL",
    "detail": "Open the `Book Your Exam` step in the funnel builder → **Edit Page** → add a one-column section → drag in the **Calendar** element → select `New Patient Exam` from the dropdown. Add a headline above it: pick your exam time, takes 40 minutes, bring your insurance card. On the `Thank You` step, build a short confirmation section: what to bring, parking info, and the office phone number. Click **Save**, then **Preview** each step on mobile width — clinics get 70%+ mobile traffic."
   },
   {
    "step": "C1 — Automation: Speed to Lead workflow",
    "tool": "GHL",
    "detail": "Left sidebar → **Automation** → **+ Create Workflow** → **Start from Scratch**, rename it `Speed to Lead — $99 Special`. Trigger: **Add New Trigger** → **Form Submitted** → **+ Add filters** → **Form is** `$99 Exam Inquiry` → **Save Trigger**. Actions in order: **Send Email** (subject `We got your request, {{contact.first_name}}!`, body thanks them and includes the `/book` link), **Send SMS** (same message compressed), **Add Contact Tag** → `new-lead`, **Create Opportunity** → pipeline `New Patient`, stage `New Inquiry`, name `{{contact.name}} — $99 Special`, status **Open**, lead value 350, then **Send Internal Notification** → **Email** to the front-desk user with `{{contact.phone}}` and the line: call within 5 minutes. Then **Wait** → Time Delay → **5 minutes** → **If/Else** on **Tags → includes → `replied`**: Replied branch gets an internal notification; the None branch sends follow-up email #2 with the booking link again. Settings tab: **Allow Re-Entry ON**, **Stop on Response OFF**, then **Publish** and **Save**."
   },
   {
    "step": "C2 — Automation: helper — mark replied",
    "tool": "GHL",
    "detail": "Create a second workflow, `Helper — Mark Replied`: trigger **Customer Replied** (no filters), single action **Add Contact Tag** → `replied`, Settings → **Allow Re-Entry ON** → **Publish**. Every workflow in this system that branches on engagement reads this one tag — build it once, reuse it everywhere."
   },
   {
    "step": "C3 — Automation: confirmations and reminders",
    "tool": "GHL",
    "detail": "New workflow `Exam Confirmations & Reminders`. Trigger: **Appointment Status** → filters **Appointment status is Confirmed** + **In calendar** `New Patient Exam` → **Save Trigger**. Actions: **Send Email** confirmation with `{{appointment.start_time}}` merged in and an **Add Contact Tag** → `exam-booked`, then **Wait** → change Wait Type to the **Event/Appointment Time** option → **24 hours BEFORE** the appointment start → **Send SMS** reminder with a confirm-by-reply line → second **Wait** → Event/Appointment Time → **1 hour BEFORE** start → **Send SMS** final reminder. Check the Wait panel's option for bookings made inside 24 hours (skip/continue if the time has passed) and note the behavior. Settings: **Allow Re-Entry ON**, **Stop on Response OFF**, time window open 24/7. **Publish**."
   },
   {
    "step": "C4 — Automation: no-show recovery",
    "tool": "GHL",
    "detail": "New workflow `No-Show Recovery`. Trigger: **Appointment Status** → status is **No-Show** + calendar `New Patient Exam`. Actions: **Send Email** (subject `We missed you today, {{contact.first_name}}` — warm, no guilt, rebooking link), **Add Contact Tag** → `no-show-recovery`, **Wait** → Time Delay → **2 days** → **Send Email** #2 (subject `Should we hold your $99 rate?`) → **Wait** → **3 days** → **Send SMS** last nudge. Also add **Update Opportunity** (or Create/Update Opportunity) to move the card back to `Contacted`. Settings: **Allow Re-Entry ON** and — opposite of C3 — **Stop on Response ON**: if they reply, a human takes over and day-2 must not send. **Publish**."
   },
   {
    "step": "C5 — Automation: post-visit review engine",
    "tool": "GHL",
    "detail": "New workflow `Post-Visit Review Request`. Trigger: **Appointment Status** → status is **Showed** + calendar `New Patient Exam`. Actions: **Wait** → Time Delay → **3 hours** → **Send Email** thank-you with what-happens-next → **Add Contact Tag** → `showed` → **Update Contact Field**: set `Last Visit` to today (use the trigger date; this arms the recall engine) → **Wait** → **1 day** → send the review ask: either the **Send Review Request** action (if Reputation Management is configured under **Reputation** → **Settings**) or a **Send SMS** with the Google review link → **Add Contact Tag** → `review-requested`. Settings: **Stop on Response ON**, **Publish**."
   },
   {
    "step": "C6 — Automation: 6-month recall reactivation",
    "tool": "GHL",
    "detail": "New workflow `6-Month Recall`. Trigger: **Add New Trigger** → **Contact Date Reminder** → select field `Last Visit` → configure **6 months AFTER** the date. Actions: **Add Contact Tag** → `recall-due`, **Create Opportunity** → pipeline `Recall`, stage `Due`, name `{{contact.name}} — Hygiene Recall` → **Send Email** (subject `{{contact.first_name}}, you're due for a cleaning`) with the booking link → **Wait** → **4 days** → **If/Else** on **Tags → includes → `exam-booked`**: booked branch ends with a **Remove Contact Tag** → `recall-due`; the None branch sends an SMS nudge, waits **7 days**, sends one final email, then moves the Recall opportunity to `Lapsed`. Settings: **Allow Re-Entry ON** (this fires every visit cycle). **Publish**."
   },
   {
    "step": "T1 — Test: run a fake patient through the full journey",
    "tool": "Test",
    "detail": "Open the live `/99-exam` page in an incognito window and submit as **Patty Test** with an email alias you own and your real phone. Within a minute verify: welcome email received, internal notification received, `new-lead` tag on the contact, opportunity card in `New Patient` → `New Inquiry`. Do not reply; confirm follow-up #2 lands after 5 minutes and walk the run in **Execution Logs**. Then book an exam through the `/book` page, verify the confirmation email with the real date merged (raw `{{appointment.start_time}}` text means a broken merge field), and check the run is parked at the 24-hour anchored **Wait**."
   },
   {
    "step": "T2 — Test: status changes and the recall trigger",
    "tool": "Test",
    "detail": "In **Calendars** → **Appointments**, set Patty's appointment to **No-Show** and confirm the recovery email arrives and the run parks at the 2-day **Wait**. Book again, set status to **Showed**, and verify the thank-you fires, `Last Visit` gets stamped on the contact, and the review request is scheduled. To test recall without waiting 6 months, temporarily edit the **Contact Date Reminder** to fire **1 day AFTER** `Last Visit`, set Patty's `Last Visit` to yesterday, confirm the recall email and `Recall` pipeline card appear — then set the trigger back to 6 months and re-**Publish**. Screenshot every canvas and one expanded execution log."
   }
  ],
  "dataModel": [
   "Pipeline `New Patient`: New Inquiry → Contacted → Exam Booked → Showed → Treatment Planned → Won / Lost",
   "Pipeline `Recall`: Due → Reminded → Rebooked → Lapsed",
   "Custom fields: `Insurance Provider` (dropdown: Delta Dental / Cigna / MetLife / Self-Pay / Other), `Last Visit` (date), `Preferred Hygienist` (single line)",
   "Tags: `new-lead`, `exam-booked`, `showed`, `no-show-recovery`, `review-requested`, `recall-due`, `reactivated`, `replied`",
   "Calendar: `New Patient Exam` — 40 min, 10 min buffer, Mon-Fri 8:00-4:20, auto-confirm ON"
  ],
  "edgeCases": [
   "A2P 10DLC not yet approved: every SMS step may show pending/failed in logs — test to your own verified number and use email evidence; register A2P on day one for a real clinic",
   "Patient books less than 24 h out: the 24-h anchored Wait is already in the past — verify the skip/continue behavior in the Wait panel and document it",
   "DND / opt-out: if a patient replies STOP, GHL flags DND — the recall workflow must still run its email steps, so never make SMS the only channel in a branch",
   "Re-entry: recall fires every visit cycle and no-show recovery can fire repeatedly — Allow Re-Entry must be ON for both, while Stop on Response differs per workflow (OFF for reminders, ON for recovery)",
   "Duplicate contacts: the front desk sometimes creates patients manually — keep Allow Duplicate Contact OFF in form settings so a second inquiry updates the same record instead of forking it"
  ],
  "acceptance": [
   "Client signs off when a test form submission gets an email response in under 60 seconds and appears as an opportunity in `New Patient` → `New Inquiry` with the `new-lead` tag",
   "Client signs off when booking through the funnel produces a confirmation with the correct merged date/time and reminders parked at 24 h and 1 h anchored Waits in Execution Logs",
   "Client signs off when marking a test appointment **No-Show** fires the recovery email within a minute and schedules the day-2 follow-up",
   "Client signs off when marking **Showed** stamps `Last Visit`, sends the thank-you, and issues a review request the next day",
   "Client signs off when a contact with `Last Visit` in the past enters the recall workflow, gets a `Recall` pipeline card, and exits cleanly if `exam-booked` is applied",
   "Client signs off when the front desk can read the two pipelines and every custom field on a contact without asking what anything means",
   "Client signs off when all five workflows are Published, foldered under `Client Systems`, and each has at least one clean end-to-end run in Execution Logs"
  ],
  "portfolio": [
   "Loom (5-7 min): submit the live funnel form as a fake patient, show the instant email, the CRM card landing in `New Inquiry`, the booking flow, then walk every workflow canvas and one execution log end-to-end",
   "Screenshots: both pipelines with test cards, the funnel's three pages, all five workflow canvases, one expanded execution log",
   "One-page system map (draw.io or paper photo): lead → funnel → CRM → each automation, with tags as the glue",
   "Frame it honestly: a demonstration build for a fictional clinic ('Summit Dental' style) — no invented patient results, just a working system a hiring agency can inspect"
  ],
  "stretch": [
   "Add a `Cancelled` status workflow that offers instant rebooking and pulls the contact out of the reminder sequence",
   "Build a Smart List of every `no-show-recovery` contact and a weekly internal digest email to the office manager",
   "Segment the recall messaging with an If/Else on `Insurance Provider` — self-pay patients get the $99 special offer, insured patients get the standard recall"
  ]
 },
 {
  "id": "c20",
  "title": "Roofing Lead Machine",
  "industry": "Roofing / Home Services",
  "stack": "ghl",
  "difficulty": "advanced",
  "hours": "10-14 h",
  "brief": [
   "I own a roofing company doing about 25 jobs a month, average ticket $12k. Leads come from everywhere — Google ads, door knockers, storm chasing, referrals — and they all end up as text messages to my sales guys' personal phones. I could not tell you today how many open quotes we have out. That number alone keeps me up at night.",
   "When a storm rolls through we get 60-80 calls in three days and we blow it every time: no landing page to send people to, no way to triage, guys writing addresses on napkins. Meanwhile our regular web leads sit for hours before anyone calls, and I know from my ad spend that every one of those costs me $80-120.",
   "I want the whole thing: a real pipeline from inspection to close, three different front doors — a free-inspection page, a financing quiz, and a storm-damage page we can turn on the day a storm hits — and automation that calls back instantly, chases every quote until it's a yes or a no, and tells me WHY we lost the ones we lost.",
   "Design for: ~150 leads/month normal, 300+ in a storm month, 5 sales reps, quotes typically open 2-3 weeks before closing."
  ],
  "painPoints": [
   "No single view of open quotes — deals live in five reps' text threads",
   "Paid leads costing $80-120 each wait hours for a first call",
   "Storm surges (60-80 inquiries in days) overwhelm intake with no triage",
   "Quotes go out and nobody follows up past the first attempt",
   "Zero data on why deals are lost, so marketing spend can't be corrected"
  ],
  "whyStack": "One GHL sub-account replaces the whole stack: Opportunities models the Inspection → Quote → Close pipeline with `Lead Source` and `Storm Zone` custom fields for attribution, Funnels hosts all three offer pages, the native Surveys builder powers the financing quiz with conditional logic, Forms captures the inspection and storm leads, Calendars books inspections, and Workflows delivers speed-to-lead, the quote-chase ladder (with Pipeline Stage Changed triggers and appointment-anchored waits), and won/lost handling that forces a `Lost Reason` before a deal dies. No form tool, no survey SaaS, no separate CRM — the pitch to a roofer is one login instead of six.",
  "guide": [
   {
    "step": "A1 — CRM: the sales pipeline",
    "tool": "GHL",
    "detail": "Left sidebar → **Opportunities** → **Pipelines** → **+ Create new pipeline**. Name it `Roof Sales` and add stages: `New Lead`, `Contacted`, `Inspection Scheduled`, `Inspected`, `Quote Sent`, `Negotiation`, `Won`, `Lost`. Click **+ Add Stage** for each and **Save**. The two stages the automation engine hooks into are `Quote Sent` (starts the chase ladder) and `Lost` (forces the reason capture) — spell them exactly as written."
   },
   {
    "step": "A2 — CRM: attribution and deal fields",
    "tool": "GHL",
    "detail": "Go to **Settings** → **Custom Fields** → **+ Add Field**, folder `Roofing`. Create `Lead Source` as **Dropdown (Single)**: `Google Ads`, `Storm Page`, `Financing Quiz`, `Door Knock`, `Referral`, `Other`. Create `Storm Zone` as **Dropdown (Single)**: `Zone A`, `Zone B`, `Zone C`, `Not Storm`. Create `Lost Reason` as **Dropdown (Single)**: `Price`, `Went with Competitor`, `Insurance Denied`, `Ghosted`, `Not Ready`. Create `Quote Amount` as **Monetary** and `Roof Age` as **Number**. Dropdowns, not free text — you cannot report on typos."
   },
   {
    "step": "A3 — CRM: tags, calendar and reps",
    "tool": "GHL",
    "detail": "In **Settings** → **Tags** create: `hot-lead`, `storm-lead`, `financing-interest`, `quote-sent`, `replied`, `closed-won`, `closed-lost`. Then **Calendars** → **Calendar Settings** → **+ Create Calendar** → **Round Robin**, name `Roof Inspection`, duration **60 minutes**, add all 5 rep users under team members so bookings distribute automatically, availability Mon-Sat **8:00 AM - 6:00 PM**, minimum scheduling notice **2 hours**. In **Settings** → **My Staff** confirm each rep has a mobile number for internal notifications."
   },
   {
    "step": "B1 — Funnel 1: free inspection landing page",
    "tool": "GHL",
    "detail": "**Sites** → **Funnels** → **+ New Funnel** → **From Blank**, name `Free Roof Inspection`. Two steps: `Landing` (path `/free-inspection`) and `Thanks` (path `/thanks`). Landing sections: hero with headline and form above the fold, how-it-works 3-step strip, licensing/insurance trust badges, service-area map section, FAQ. Build the form in **Sites** → **Forms** → **Builder** → **+ Add Form**, name `Inspection Request`: **First Name**, **Phone**, **Email**, **Full Address** (the address element — reps need it), plus a custom-field element mapped to `Roof Age`. Add a **hidden field** mapped to `Lead Source` with default value `Google Ads`. On Submit → redirect to `/thanks`. Drop the form into the hero."
   },
   {
    "step": "B2 — Funnel 2: financing quiz as a native survey",
    "tool": "GHL",
    "detail": "**Sites** → **Surveys** → **Builder** → **+ Add Survey**, name `Roof Financing Quiz`. Build slides: Q1 what's happening with your roof (options: leak, storm damage, just old, not sure), Q2 monthly payment comfort mapped to a custom field `Payment Comfort` (**Dropdown**: `Under $150`, `$150-300`, `$300+`), Q3 timeline, final slide captures **Name**, **Phone**, **Email**. Use the survey's **Logic** settings so answering `storm damage` jumps to a slide asking for the address. In **Sites** → **Funnels** create funnel `Financing Quiz` with step `/quiz`, drag on the **Survey** element and select `Roof Financing Quiz`. Set a hidden `Lead Source` value of `Financing Quiz` on the survey's contact slide."
   },
   {
    "step": "B3 — Funnel 3: storm-damage rapid-response page",
    "tool": "GHL",
    "detail": "**Sites** → **Funnels** → **+ New Funnel**, name `Storm Response`, one step at `/storm`. Sections: urgent hero (storm date headline you edit per event), we-work-with-insurance section, before/after gallery placeholder labeled as demo imagery, and a short form `Storm Damage Check` built in the **Forms** builder: **Name**, **Phone**, **Full Address**, plus custom-field elements for `Storm Zone` (the dropdown) and a hidden `Lead Source` defaulted to `Storm Page`. The whole page must load fast and work one-handed on a phone — storm victims are standing in their driveway. **Save** and **Preview** on mobile width."
   },
   {
    "step": "B4 — Funnel: booking step shared by all three",
    "tool": "GHL",
    "detail": "In the `Free Roof Inspection` funnel add a step `Book` at `/book`: one section with the **Calendar** element pointed at `Roof Inspection`, headline pick a time and a rep will be on your roof. Point the thank-you pages of all three funnels at this `/book` URL with a big button — every front door funnels into the same calendar, which is what makes the round-robin distribution work."
   },
   {
    "step": "C1 — Automation: speed-to-lead with storm triage",
    "tool": "GHL",
    "detail": "**Automation** → **+ Create Workflow** → **Start from Scratch**, name `Speed to Lead — All Sources`. Trigger 1: **Form Submitted**, filter **Form is** `Inspection Request`; click **Add New Trigger** again to add Trigger 2: **Form Submitted**, filter `Storm Damage Check`; Trigger 3: **Survey Submitted**, filter `Roof Financing Quiz` (multiple triggers into one workflow keeps the ladder in one place). Actions: **Send SMS** (`Hi {{contact.first_name}}, thanks for reaching out — a rep is being assigned now. Book your inspection: [link to /book]`), **Send Email** with the same content, **Create Opportunity** → pipeline `Roof Sales`, stage `New Lead`, name `{{contact.name}} — {{contact.lead_source}}` (pick `Lead Source` from the merge-field picker's custom fields). Then **If/Else** on **`Lead Source` is `Storm Page`**: storm branch adds tag `storm-lead` and sends an **Internal Notification** SMS to the on-call rep flagged URGENT-STORM; the None branch sends a standard **Internal Notification** email. Then **Wait** → **5 minutes** → **If/Else** on **Tags includes `replied`** (build the same `Helper — Mark Replied` workflow as c19: trigger **Customer Replied** → **Add Contact Tag** `replied`): the None branch sends follow-up SMS #2. Settings: **Allow Re-Entry ON**, **Stop on Response OFF**, **Publish**."
   },
   {
    "step": "C2 — Automation: inspection booked and reminders",
    "tool": "GHL",
    "detail": "New workflow `Inspection Booked`. Trigger: **Appointment Status** → status is **Confirmed** + **In calendar** `Roof Inspection`. Actions: **Update Opportunity** (Create/Update Opportunity re-pointing at the existing `Roof Sales` card) → stage `Inspection Scheduled`; **Send Email** confirmation with `{{appointment.start_time}}` and what-to-expect; **Wait** → **Event/Appointment Time** → **24 hours BEFORE** start → **Send SMS** reminder; **Wait** → Event/Appointment Time → **1 hour BEFORE** → **Send SMS** (`{{contact.first_name}}, your roofer is en route within the hour`). Settings: **Allow Re-Entry ON**, **Stop on Response OFF**, **Publish**."
   },
   {
    "step": "C3 — Automation: the quote-chase ladder",
    "tool": "GHL",
    "detail": "New workflow `Quote Chase`. Trigger: **Add New Trigger** → **Pipeline Stage Changed** → filters: **Pipeline is** `Roof Sales`, **Moved to stage** `Quote Sent` → **Save Trigger**. Actions: **Add Contact Tag** `quote-sent`, **Send Email** day 0 (subject `Your roof quote is attached — here's how to read it`), **Wait** → Time Delay → **2 days** → **If/Else** on **Tags includes `replied`** — every rung repeats this same pattern. No-reply path: **Send SMS** day 2 (`Any questions on the quote? Happy to walk through it — takes 5 min`), **Wait** → **3 days** → **Send Email** day 5 (financing angle: mention the payment-comfort option they chose using the `Payment Comfort` merge field), **Wait** → **4 days** → **Send SMS** day 9, **Wait** → **5 days** → **Send Email** day 14 breakup note (`Should I close your file?`) and an **Internal Notification** to the assigned rep to make one final call. Add a **Goal Event** (or an early If/Else exit) so that reaching stage `Won` or `Lost` pulls the contact out of the ladder immediately. Settings: **Allow Re-Entry ON** (a revised quote restarts the chase), **Stop on Response ON** — the moment they reply, a rep owns it. **Publish**."
   },
   {
    "step": "C4 — Automation: won handling",
    "tool": "GHL",
    "detail": "New workflow `Deal Won`. Trigger: **Pipeline Stage Changed** → pipeline `Roof Sales`, moved to `Won` (add a second trigger **Opportunity Status Changed** → status is **Won** so it fires however the rep closes it). Actions: **Add Contact Tag** `closed-won`, **Remove Contact Tag** `quote-sent`, **Send Email** welcome (what happens before crew day, permit timeline), **Internal Notification** to the office to schedule production, **Wait** → **14 days** (roughly job completion) → **Send SMS** review request with the Google link, **Wait** → **7 days** → **Send Email** referral ask ($250 referral credit framing). Settings: **Allow Re-Entry OFF** — a customer wins once per job. **Publish**."
   },
   {
    "step": "C5 — Automation: lost handling with forced reason",
    "tool": "GHL",
    "detail": "New workflow `Deal Lost`. Trigger: **Pipeline Stage Changed** → pipeline `Roof Sales`, moved to `Lost`. Actions: **Add Contact Tag** `closed-lost`, **Remove Contact Tag** `quote-sent`, then **If/Else** on **`Lost Reason` is empty** (condition: custom field `Lost Reason` → is empty): the empty branch sends an **Internal Notification** to the rep — fill in `Lost Reason` on this contact before end of day — so no deal dies undiagnosed. Below the If/Else: a polite **Send Email** (`Thanks for considering us — we'll be here if anything changes`), **Wait** → Time Delay → **90 days** → **If/Else** on **`Lost Reason` is `Not Ready`** → that branch re-opens with a check-in email and moves a fresh opportunity to `New Lead`. Settings: **Allow Re-Entry ON**. **Publish**."
   },
   {
    "step": "T1 — Test: all three front doors",
    "tool": "Test",
    "detail": "Submit each funnel in incognito as three different fake leads (`you+inspect@`, `you+quiz@`, `you+storm@`, your own phone). Verify each lands in `Roof Sales` → `New Lead` with the correct `Lead Source` value on the contact — that field is the whole attribution story, so check all three. Confirm the storm lead took the URGENT branch (internal SMS) in **Execution Logs** and the other two took the standard branch. Book an inspection as one of them and confirm the card moved to `Inspection Scheduled` and the run parked at the 24-h anchored **Wait**."
   },
   {
    "step": "T2 — Test: drive a deal through the ladder",
    "tool": "Test",
    "detail": "Drag the test opportunity to `Quote Sent` on the **Opportunities** board and watch `Quote Chase` enroll in **Enrollment History**. Confirm the day-0 email arrives, then reply to it from the fake lead's inbox and verify the run stops (Stop on Response) and the `replied` tag landed via the helper. Run a second lead to `Quote Sent`, don't reply, and temporarily shrink the Waits to minutes to watch two rungs fire in order — then restore the real durations (2/3/4/5 days) and re-**Publish**. Finally drag cards to `Won` and `Lost` (leaving `Lost Reason` blank on purpose) and confirm the welcome email, the review timer, and the fill-in-the-reason internal notification all fire. Screenshot every canvas, the pipeline board, and one expanded log."
   }
  ],
  "dataModel": [
   "Pipeline `Roof Sales`: New Lead → Contacted → Inspection Scheduled → Inspected → Quote Sent → Negotiation → Won / Lost",
   "Custom fields: `Lead Source` (dropdown: Google Ads / Storm Page / Financing Quiz / Door Knock / Referral / Other), `Storm Zone` (dropdown: Zone A / B / C / Not Storm), `Lost Reason` (dropdown: Price / Went with Competitor / Insurance Denied / Ghosted / Not Ready), `Quote Amount` (monetary), `Roof Age` (number), `Payment Comfort` (dropdown, set by the quiz)",
   "Tags: `hot-lead`, `storm-lead`, `financing-interest`, `quote-sent`, `replied`, `closed-won`, `closed-lost`",
   "Calendar: `Roof Inspection` — round robin across 5 reps, 60 min, Mon-Sat 8-6, 2 h minimum notice"
  ],
  "edgeCases": [
   "A2P 10DLC pending: the quote-chase SMS rungs will show failed/pending — test to your own number, keep an email rung beside every SMS rung so the ladder degrades gracefully",
   "Reply mid-ladder: Stop on Response must be ON for `Quote Chase` but OFF for speed-to-lead and reminders — same switch, opposite correct answers; document why",
   "Deal closes mid-chase: without the Goal/early-exit on `Won`/`Lost`, a customer who already signed keeps getting chase messages — the single most embarrassing bug in this build",
   "Storm re-entry: the same homeowner can submit the storm form after two different storms — Allow Re-Entry ON, and Allow Duplicate Contact OFF on forms so the record updates instead of duplicating",
   "Business-hours window: internal URGENT-STORM alerts should fire 24/7, but consider a workflow time window on customer-facing chase SMS so nobody gets a 2 AM text"
  ],
  "acceptance": [
   "Client signs off when all three funnels create contacts with the correct `Lead Source` and a `New Lead` opportunity within 60 seconds of submission",
   "Client signs off when a storm-page lead triggers the urgent internal SMS branch and standard leads do not (verified in Execution Logs)",
   "Client signs off when booking an inspection moves the card to `Inspection Scheduled` and parks anchored reminders at 24 h and 1 h",
   "Client signs off when dragging a card to `Quote Sent` starts the 4-rung chase, and replying to any rung halts it",
   "Client signs off when a card reaching `Won` or `Lost` exits the chase immediately and fires the correct closing sequence",
   "Client signs off when a `Lost` deal with no `Lost Reason` generates an internal notification demanding one",
   "Client signs off when the Opportunities board answers 'how many open quotes do we have and what are they worth' at a glance using `Quote Amount`"
  ],
  "portfolio": [
   "Loom (6-8 min): submit each of the three funnels live, show the three leads landing with different `Lead Source` values, drag one deal through `Quote Sent` → chase → `Won`, and walk the `Quote Chase` canvas rung by rung",
   "Screenshots: pipeline board with test deals at multiple stages, all three funnel pages on mobile width, the survey logic settings, the `Quote Chase` and `Deal Lost` canvases, one expanded execution log",
   "A one-page attribution note: how `Lead Source` + `Lost Reason` dropdowns turn into reports the owner can act on",
   "Present it as a demonstration build for a fictional roofing company — no invented close rates or revenue claims, just the working machine"
  ],
  "stretch": [
   "Add a `Storm Mode` toggle: a workflow triggered by tag `storm-mode` that swaps internal routing to an all-hands notification list during surge weeks",
   "Build a weekly digest: Smart List of `quote-sent` contacts older than 14 days emailed to the owner every Monday morning",
   "Wire Eliza / conversation AI or a simple keyword auto-reply so an inbound `YES` on any chase SMS books the follow-up call automatically"
  ]
 },
 {
  "id": "c21",
  "title": "Gym 6-Week-Challenge System",
  "industry": "Fitness / Gym",
  "stack": "ghl",
  "difficulty": "intermediate",
  "hours": "8-12 h",
  "brief": [
   "I run a 300-member functional fitness gym and our 6-week challenge is the best thing we sell — $199, and about 40% of finishers convert to a $149/month membership. Problem is, every launch is chaos. We take payments through a link in our Instagram bio, track sign-ups in a Google Sheet, and text people reminders from my personal phone.",
   "Last challenge we had 62 sign-ups and I know we dropped the ball: at least 10 people paid and never got the welcome info, a handful showed up on the wrong day, and I never followed up with the 35 people who finished but didn't join as members. That's real money left on the mat.",
   "I want the whole thing in one system: a proper sales page with checkout (and I want to try selling a $29 meal-plan add-on at checkout), every buyer in a CRM I can actually see, automatic onboarding, session reminders, check-ins halfway through, and a membership pitch that goes out automatically when the challenge ends. Plus something that catches people who try to cancel.",
   "Numbers: we run 4 challenges a year, 50-70 sign-ups each, two kickoff sessions per challenge, and I want the meal-plan bump to hit at least 25% take rate."
  ],
  "painPoints": [
   "Payments, sign-ups, and reminders live in three disconnected tools plus a personal phone",
   "Paid customers sometimes never receive onboarding info",
   "No structured mid-challenge touchpoint, so drop-offs go unnoticed until week 5",
   "Finishers get no systematic membership offer — the highest-value moment is left to chance",
   "Cancellations are accepted with zero save attempt"
  ],
  "whyStack": "GHL natively covers the entire funnel-to-membership motion: Payments → Products defines the $199 challenge and the $29 meal-plan bump, a Funnels two-step order form takes the money with the native order bump feature, Opportunities tracks every challenger through a Challenge pipeline, Calendars handles kickoff-session booking, and Workflows runs onboarding, session reminders (appointment-anchored waits), the day-21 check-in, the post-challenge upsell, and the cancel-save branch — all triggered by native events like Order Form Submission, Appointment Status, and tag changes. No Stripe checkout page, no Mailchimp, no spreadsheet.",
  "guide": [
   {
    "step": "A1 — CRM: challenge pipeline and stages",
    "tool": "GHL",
    "detail": "Left sidebar → **Opportunities** → **Pipelines** → **+ Create new pipeline**, name `6-Week Challenge`. Stages: `Lead`, `Purchased`, `Onboarded`, `Active`, `Finished`, `Member`, `Lost`. Click **+ Add Stage** for each, **Save**. The automation engine moves cards along this pipeline — the owner should be able to glance at the board mid-challenge and see exactly who is where."
   },
   {
    "step": "A2 — CRM: custom fields and tags",
    "tool": "GHL",
    "detail": "**Settings** → **Custom Fields** → **+ Add Field**, folder `Challenge`. Create `Challenge Start Date` as **Date**, `Fitness Goal` as **Dropdown (Single)** (`Lose Weight`, `Build Strength`, `General Fitness`), `Shirt Size` as **Dropdown (Single)** (`S`-`XXL`). Then **Settings** → **Tags** → **+ New Tag** for: `challenge-buyer`, `meal-plan-buyer`, `challenge-active`, `challenge-finished`, `member`, `cancel-request`, `saved`, `replied`. Every workflow in Phase C keys off these exact strings."
   },
   {
    "step": "A3 — CRM: kickoff session calendar",
    "tool": "GHL",
    "detail": "**Calendars** → **Calendar Settings** → **+ Create Calendar**, name `Challenge Kickoff`, type **Class Booking** (one coach, many attendees) if your plan shows it — otherwise a standard calendar with slot capacity raised. Duration **60 minutes**, seats **35 per session**, availability limited to the two kickoff evenings (e.g. Mon and Wed **6:00-7:00 PM** of launch week). Set bookings to auto-**Confirmed**. This is what kills the wrong-day problem: people pick their own session and get anchored reminders."
   },
   {
    "step": "A4 — Setup: products for the challenge and the bump",
    "tool": "Setup",
    "detail": "Connect payments first: **Payments** → **Integrations** → connect **Stripe** (test mode is fine for the demo build). Then **Payments** → **Products** → **+ Create Product**: name `6-Week Challenge`, one-time price **$199.00**. Create a second product `Challenge Meal Plan`, one-time price **$29.00**. These two products are what the order form in Phase B sells; keeping the bump as its own product is what lets you track take rate."
   },
   {
    "step": "B1 — Funnel: sales page structure",
    "tool": "GHL",
    "detail": "**Sites** → **Funnels** → **+ New Funnel** → **From Blank**, name `6-Week Challenge Launch`. Steps: `Sales Page` (path `/challenge`), `Checkout` (path `/join`), `Thank You` (path `/welcome`). Sales-page section outline: hero (headline, next start date, **Join the Challenge** button anchoring to checkout), how-it-works (3 workouts/week, coaching, nutrition guide), what-you-get list, coach intro, schedule section with the two kickoff options, honest FAQ (no fabricated transformation claims — this is a demo build), final CTA. Build each section with the page builder's **+ Add Section** → rows → elements, and set every **Join** button's action to go to the `/join` step."
   },
   {
    "step": "B2 — Funnel: two-step order form with the $29 bump",
    "tool": "GHL",
    "detail": "Open the `Checkout` step → **Edit Page** → add a section → drag on the **Order Form** element (choose the **two-step** version: step 1 contact info, step 2 payment). In the element's settings, add product `6-Week Challenge` ($199) as the main offer. Then configure the **Order Bump**: enable the bump checkbox, select product `Challenge Meal Plan` ($29), headline `Add the 6-Week Meal Plan for $29?`, 2-line description. In the funnel step's **Products** tab confirm both products are attached. Set the order form's confirmation to redirect to `/welcome`. On the `Thank You` page: welcome video placeholder, what-happens-next list, and a **Calendar** element pointed at `Challenge Kickoff` so they book their session before they leave the page."
   },
   {
    "step": "B3 — Funnel: lead capture for the not-ready crowd",
    "tool": "GHL",
    "detail": "On the sales page, add a modest section near the FAQ with a **Form** element: build `Challenge Waitlist` in **Sites** → **Forms** → **Builder** with **Name**, **Email**, **Phone**, and a custom-field element mapped to `Fitness Goal`. On Submit → show a thank-you message. This feeds the `Lead` stage so the next launch starts with a warm list instead of zero."
   },
   {
    "step": "C1 — Automation: purchase → onboarding sequence",
    "tool": "GHL",
    "detail": "**Automation** → **+ Create Workflow** → **Start from Scratch**, name `Challenge Onboarding`. Trigger: **Add New Trigger** → **Order Form Submission** → **+ Add filters** → funnel/page is the `Checkout` step of `6-Week Challenge Launch` → **Save Trigger**. Actions in order: **Add Contact Tag** `challenge-buyer`; **If/Else** on whether the order contains the bump — if your trigger filters expose the product, condition on **Product is** `Challenge Meal Plan`, otherwise use a **Payment Received** trigger variant filtered by product in a tiny helper workflow that applies `meal-plan-buyer` — the bump branch adds tag `meal-plan-buyer` and sends the meal-plan PDF email; **Create Opportunity** → pipeline `6-Week Challenge`, stage `Purchased`, name `{{contact.name}} — Challenge`, value 199; **Send Email** welcome #1 (receipt recap, book-your-kickoff link to `/welcome`, what to bring); **Send SMS** short welcome; **Wait** → Time Delay → **1 day** → **If/Else** on **Tags includes `challenge-active`** (applied when they book kickoff — see C2): the None branch sends a nudge email `Pick your kickoff session` with the calendar link, **Wait** → **2 days** → second nudge SMS. Settings: **Allow Re-Entry ON** (people repeat challenges), **Stop on Response OFF**. **Publish**."
   },
   {
    "step": "C2 — Automation: kickoff booked and session reminders",
    "tool": "GHL",
    "detail": "New workflow `Kickoff Reminders`. Trigger: **Appointment Status** → status is **Confirmed** + **In calendar** `Challenge Kickoff`. Actions: **Add Contact Tag** `challenge-active`; **Update Contact Field** → `Challenge Start Date` = the appointment date; **Update Opportunity** → stage `Onboarded`; **Send Email** confirmation with `{{appointment.start_time}}`, parking info, what to wear; **Wait** → **Event/Appointment Time** → **24 hours BEFORE** start → **Send SMS** reminder; **Wait** → Event/Appointment Time → **2 hours BEFORE** → **Send SMS** (`See you tonight, {{contact.first_name}}! Doors open 15 min early.`). Settings: **Allow Re-Entry ON**, **Stop on Response OFF**, **Publish**."
   },
   {
    "step": "C3 — Automation: mid-challenge check-in",
    "tool": "GHL",
    "detail": "New workflow `Day-21 Check-In`. Trigger: **Contact Tag** → **Tag Added** → `challenge-active`. Actions: **Wait** → Time Delay → **21 days**; **Update Opportunity** → stage `Active` (belt-and-braces if it wasn't moved); **Send SMS** (`{{contact.first_name}}, you're halfway! Reply with one word for how it's going: CRUSHING / OK / STRUGGLING`); **Wait** → **1 day** → **If/Else** on **Tags includes `replied`**: the None branch sends a check-in email from the head coach and an **Internal Notification** to the coach listing the contact as quiet-since-kickoff so a human reaches out. Settings: **Stop on Response OFF** (the reply IS the data; the helper `Helper — Mark Replied` — trigger **Customer Replied** → **Add Contact Tag** `replied` — stamps it). **Publish**."
   },
   {
    "step": "C4 — Automation: post-challenge membership upsell",
    "tool": "GHL",
    "detail": "New workflow `Membership Upsell`. Trigger: **Contact Tag** → **Tag Added** → `challenge-active`. Actions: **Wait** → Time Delay → **42 days** (6 weeks from kickoff); **Add Contact Tag** `challenge-finished`; **Remove Contact Tag** `challenge-active`; **Update Opportunity** → stage `Finished`; **Send Email** congratulations + the offer: challengers get the $149/month membership with sign-up fee waived for 7 days; **Wait** → **2 days** → **Send SMS** nudge; **Wait** → **3 days** → **Send Email** deadline-48h reminder; **Wait** → **2 days** → final SMS on deadline day. Add an early exit: **If/Else** before each send on **Tags includes `member`** so anyone who already joined skips the rest (the front desk applies `member` when they sign — that tag also moves the card to `Member` via a 2-step helper workflow: trigger **Contact Tag** `member` → **Update Opportunity** stage `Member`). Settings: **Allow Re-Entry ON**, **Stop on Response ON** — a reply about membership goes to a human. **Publish**."
   },
   {
    "step": "C5 — Automation: cancel-save",
    "tool": "GHL",
    "detail": "New workflow `Cancel Save`. Trigger: **Contact Tag** → **Tag Added** → `cancel-request` (front desk or a reply keyword applies this tag when someone asks to cancel or refund). Actions: **Internal Notification** → SMS + email to the owner immediately with `{{contact.name}}` and phone; **Send Email** to the member (empathetic, offers a pause option and a 10-minute call with the coach, one-click booking link); **Wait** → Time Delay → **1 day** → **If/Else** on **Tags includes `saved`** (owner applies `saved` after the call): the None branch sends one respectful final email confirming the cancellation will be processed, and an **Internal Notification** to actually process it. Never auto-argue past one save attempt. Settings: **Allow Re-Entry ON**, **Stop on Response ON**. **Publish**."
   },
   {
    "step": "T1 — Test: buy the challenge end-to-end",
    "tool": "Test",
    "detail": "With Stripe in test mode, open `/challenge` in incognito, click through to `/join`, and buy as **Bella Burpee** (`you+bella@`, your phone, Stripe test card `4242 4242 4242 4242`). Tick the meal-plan bump. Verify: payment succeeds, redirect to `/welcome`, tags `challenge-buyer` + `meal-plan-buyer` on the contact, opportunity in `Purchased` with value 199, welcome email + meal-plan email received. Book a kickoff slot from the thank-you page and confirm `challenge-active` lands, `Challenge Start Date` is stamped, the card moves to `Onboarded`, and the run parks at the 24-h anchored **Wait** in **Execution Logs**."
   },
   {
    "step": "T2 — Test: time-shift the long waits",
    "tool": "Test",
    "detail": "You cannot wait 42 days: temporarily edit `Day-21 Check-In` and `Membership Upsell` waits down to **2 minutes**, re-**Publish**, and re-apply `challenge-active` to Bella (remove and re-add the tag to re-trigger). Watch the check-in SMS, then the upsell sequence fire in order in **Execution Logs**; reply to one message and confirm Stop-on-Response halts the upsell ladder. Apply `cancel-request` to a second test contact and verify the owner alert + save email, then apply `saved` and confirm the final-cancellation branch is skipped. Restore all real durations (21 d / 42 d / 1 d), re-**Publish** every workflow, and screenshot canvases, the order form with the bump visible, and the pipeline board."
   }
  ],
  "dataModel": [
   "Pipeline `6-Week Challenge`: Lead → Purchased → Onboarded → Active → Finished → Member / Lost",
   "Custom fields: `Challenge Start Date` (date), `Fitness Goal` (dropdown: Lose Weight / Build Strength / General Fitness), `Shirt Size` (dropdown S-XXL)",
   "Tags: `challenge-buyer`, `meal-plan-buyer`, `challenge-active`, `challenge-finished`, `member`, `cancel-request`, `saved`, `replied`",
   "Calendar: `Challenge Kickoff` — class booking, 60 min, 35 seats, two evening slots in launch week, auto-confirm ON",
   "Products: `6-Week Challenge` $199 one-time, `Challenge Meal Plan` $29 one-time (order bump)"
  ],
  "edgeCases": [
   "A2P 10DLC pending: session-reminder and check-in SMS may not deliver publicly — test against your own verified number and pair every SMS with an email sibling",
   "Repeat challengers: someone who did the spring challenge buys the fall one — Allow Re-Entry ON everywhere, and the `challenge-finished`/`challenge-active` tag swap must be clean or they get two overlapping sequences",
   "Refund/cancel mid-sequence: `cancel-request` must also remove the contact from `Membership Upsell` (add the tag to that workflow's exit conditions) or you'll upsell someone you just refunded",
   "Reply keyword collisions: the day-21 CRUSHING/OK/STRUGGLING reply must not be swallowed by DND keywords — never ask users to reply STOP-adjacent words",
   "Business hours: put a workflow time window on check-in and upsell SMS (e.g. 9 AM - 8 PM) — kickoff reminders can stay 24/7 since they're anchored to session time"
  ],
  "acceptance": [
   "Client signs off when a test purchase with the bump ticked charges $228 in Stripe test mode, tags both `challenge-buyer` and `meal-plan-buyer`, and creates a `Purchased` opportunity",
   "Client signs off when booking a kickoff slot stamps `Challenge Start Date`, moves the card to `Onboarded`, and parks anchored 24-h and 2-h reminders",
   "Client signs off when a buyer who doesn't book kickoff within 1 day gets the nudge email and SMS automatically",
   "Client signs off when the day-21 check-in fires and a non-reply generates a coach notification with the member's name",
   "Client signs off when the 6-week upsell ladder runs on schedule and a `member` tag exits the contact and moves the card to `Member`",
   "Client signs off when applying `cancel-request` alerts the owner within a minute and the save flow runs exactly one respectful attempt"
  ],
  "portfolio": [
   "Loom (5-7 min): buy the challenge live with a Stripe test card including the bump, show the contact, tags, and pipeline card appear, book kickoff, then walk all five workflow canvases and one execution log",
   "Screenshots: sales page and two-step order form with the bump visible, pipeline board with test cards, each workflow canvas, the Stripe test-mode payment record",
   "A launch-runbook page: exactly what the gym owner edits per launch (dates on the sales page, kickoff calendar slots, start-date copy) — proves you think in handoffs",
   "Frame honestly: demonstration build with test-mode payments for a fictional gym — no real revenue or conversion claims"
  ],
  "stretch": [
   "Replace the manual `member` tag with a real recurring product: `Gym Membership` $149/month in **Payments** → **Products** and a second order form, with Payment Received driving the `Member` stage",
   "Add a referral loop: day-28 SMS offering challengers a bring-a-friend pass, tracked with a `referral-sent` tag",
   "Build a waitlist launch sequence: 3 emails to the `Lead` stage that open and close enrollment around each quarterly start date"
  ]
 },
 {
  "id": "c22",
  "title": "High-Ticket Coaching Machine",
  "industry": "Coaching / Info Business",
  "stack": "ghl",
  "difficulty": "advanced",
  "hours": "12-16 h",
  "brief": [
   "I sell a $6k, 12-week business coaching program. My funnel today is a Calendly link in my Instagram bio, and it's killing me: I did 31 sales calls last month and 19 of them were people who could never afford the program or hadn't watched anything about how I work. That's two full days of my life talking to unqualified leads.",
   "I run a monthly webinar that converts well when people actually show up — but show-up rate is about 30% because my only reminder is the confirmation email the webinar tool sends. And people who miss it never hear from me again. There's no replay, no follow-up, nothing.",
   "I want the whole thing built properly: webinar registration and replay pages, an application that filters out people who aren't a fit BEFORE they can book — with an honest, kind decline for the rest — a call calendar with a real reminder ladder, no-show recovery, nurture for people who don't buy on the call, and a client portal where my actual clients get their program materials. All in one platform, all visible in one pipeline.",
   "Volumes: ~400 webinar registrants/month, ~60 applications, I want to hold no more than 25 calls, and I onboard 6-10 new clients a month."
  ],
  "painPoints": [
   "60%+ of sales calls are unqualified — no application filter in front of the calendar",
   "Webinar show-up rate stuck around 30% with a single reminder email",
   "No replay sequence: registrants who miss the live event fall into a void",
   "Call no-shows (about 1 in 4) are never rescheduled systematically",
   "Client onboarding and program materials are scattered across email attachments and Google Drive links"
  ],
  "whyStack": "This is the flagship GHL use case, natively end-to-end: Funnels builds the webinar registration, replay, and application pages; Surveys provides the application with conditional logic and field mapping for the disqualification math; Calendars gates the strategy-call booking behind qualification; Workflows runs the reminder ladders, the auto-decline path, no-show recovery, and post-call nurture with If/Else branches on survey fields; Opportunities tracks Application → Call → Close; and the native Memberships product delivers the client portal, with a workflow granting course access the moment a deal is Won. Zero external webinar CRM, form tool, or course platform.",
  "guide": [
   {
    "step": "A1 — CRM: sales pipeline",
    "tool": "GHL",
    "detail": "**Opportunities** → **Pipelines** → **+ Create new pipeline**, name `Coaching Sales`. Stages: `Registered`, `Attended`, `Applied`, `Qualified`, `Call Booked`, `Call Held`, `Offer Made`, `Won`, `Lost`, `Declined`. Click **+ Add Stage** per stage, **Save**. `Declined` is deliberately separate from `Lost`: declined means the application filter said no; lost means a qualified prospect said no — the difference is the whole point of the system."
   },
   {
    "step": "A2 — CRM: qualification fields and tags",
    "tool": "GHL",
    "detail": "**Settings** → **Custom Fields** → **+ Add Field**, folder `Application`. Create `Monthly Revenue` as **Dropdown (Single)**: `Pre-revenue`, `Under $2k`, `$2k-$5k`, `$5k-$15k`, `$15k+`. Create `Commitment Level` as **Dropdown (Single)**: `Ready now`, `Within 3 months`, `Just exploring`. Create `Biggest Obstacle` as **Multi Line** text and `Application Date` as **Date**. Then **Settings** → **Tags**: `webinar-registered`, `webinar-attended`, `webinar-noshow`, `applied`, `qualified`, `disqualified`, `call-booked`, `call-noshow`, `client`, `nurture`, `replied`."
   },
   {
    "step": "A3 — CRM: the strategy-call calendar",
    "tool": "GHL",
    "detail": "**Calendars** → **Calendar Settings** → **+ Create Calendar**, personal booking calendar named `Strategy Call`, duration **45 minutes**, buffer **15 minutes**, availability Tue-Thu **10:00 AM - 3:00 PM** only (25-call cap comes from constrained supply, not policing), minimum notice **12 hours**, date range 14 days out. Auto-**Confirmed** on booking. Critically, this calendar's link is never published anywhere — it is only handed out by the qualification branch in C3, which is what makes the filter real."
   },
   {
    "step": "A4 — CRM: the client portal (Memberships)",
    "tool": "GHL",
    "detail": "Left sidebar → **Memberships** (or **Sites** → **Memberships**) → **Products** → **+ Create Product**, name `12-Week Program Portal`. Add categories `Week 1-4 Foundations`, `Week 5-8 Growth`, `Week 9-12 Scale`, and inside each add a few placeholder lessons (**+ New Post**) with a video placeholder and a worksheet description. In **Offers**, create offer `Coaching Clients` containing the product, price **free** (the $6k is collected on the call/invoice; the offer is the access key). The Phase C won-workflow grants this offer automatically."
   },
   {
    "step": "B1 — Funnel: webinar registration + confirmation",
    "tool": "GHL",
    "detail": "**Sites** → **Funnels** → **+ New Funnel** → **From Blank**, name `Webinar Funnel`. Steps: `Register` (path `/webinar`), `Confirmed` (path `/confirmed`), `Replay` (path `/replay`), `Apply` (path `/apply`), `Book` (path `/book`), `Thanks` (path `/thanks`). Register-page sections: hero with the webinar promise and date, 3 bullet takeaways, host bio, registration **Form** (`Webinar Registration` built in the Forms builder: **First Name**, **Email**, **Phone**) with On Submit → redirect `/confirmed`. Confirmed page: add-to-calendar instructions, what-to-bring, and set expectation that the replay link comes only to registrants."
   },
   {
    "step": "B2 — Funnel: replay page and application survey",
    "tool": "GHL",
    "detail": "Build the `Replay` page: video placeholder section, availability note (replay comes down in 72 hours — say it and mean it in the automation), and a CTA button to `/apply`. Then **Sites** → **Surveys** → **Builder** → **+ Add Survey**, name `Program Application`. Slides: 1) business description (**Multi Line**, map to `Biggest Obstacle`), 2) `Monthly Revenue` question mapped to the custom field via the field picker — check the mapping on every slide, unmapped answers vanish, 3) `Commitment Level` mapped likewise, 4) contact slide (**Name**, **Email**, **Phone**). On the `Apply` funnel page, drop in the **Survey** element and select `Program Application`. Survey submit → redirect `/thanks` (a neutral we're-reviewing page — the workflow decides which email they get, so the page itself must not promise a call)."
   },
   {
    "step": "B3 — Funnel: gated booking page",
    "tool": "GHL",
    "detail": "Build the `Book` page: short congrats copy (you're a fit for a strategy call), a **Calendar** element pointed at `Strategy Call`, and 2-3 prep bullets. This URL is only ever delivered inside the qualified-branch email from C3 — do not link it from any nav or public page. On `Thanks`, keep copy neutral: application received, you'll hear from us within one business day."
   },
   {
    "step": "C1 — Automation: registration + reminder ladder",
    "tool": "GHL",
    "detail": "**Automation** → **+ Create Workflow** → **Start from Scratch**, name `Webinar Reminders`. Trigger: **Form Submitted** → filter **Form is** `Webinar Registration`. Actions: **Add Contact Tag** `webinar-registered`; **Create Opportunity** → pipeline `Coaching Sales`, stage `Registered`; **Send Email** confirmation with date/time and calendar-add note; **Wait** → Time Delay until roughly **24 hours before** the event (for a fixed monthly webinar use a Time Delay sized to the campaign, or the Wait's specific-date option set per event) → **Send Email** reminder #1; **Wait** → to **1 hour before** → **Send SMS** (`We're live in 1 hour — grab your seat: [link]`); **Wait** → to **15 minutes before** → **Send SMS** (`Starting now: [link]`). Settings: **Allow Re-Entry ON** (they can register monthly), **Stop on Response OFF**. **Publish**. Note in your build doc: the per-event date edit is a 2-minute monthly task for the client — write it into the runbook."
   },
   {
    "step": "C2 — Automation: attended vs no-show split + replay",
    "tool": "GHL",
    "detail": "New workflow `Post-Webinar Split`. Trigger: **Contact Tag** → **Tag Added** → `webinar-attended` (the host applies it from the attendee list after the event — or via a Smart List bulk action; document this 5-minute manual step honestly). Actions: **Update Opportunity** → stage `Attended`; **Send Email** thanks-for-attending with the `/apply` link; **Wait** → **1 day** → **If/Else** on **Tags includes `applied`**: None branch sends the application nudge email. Second workflow `Replay Sequence`: trigger **Contact Tag** → **Tag Added** → `webinar-noshow` (bulk-applied to registrants minus attendees). Actions: **Send Email** replay link to `/replay` (`You missed it — replay is up for 72 hours`); **Wait** → **2 days** → **Send Email** replay-closing-tomorrow with the `/apply` link; **Wait** → **1 day** → **Send SMS** final hours. Both: **Allow Re-Entry ON**, **Publish**."
   },
   {
    "step": "C3 — Automation: application triage with auto-decline",
    "tool": "GHL",
    "detail": "New workflow `Application Triage` — the heart of the machine. Trigger: **Survey Submitted** → filter **Survey is** `Program Application`. Actions: **Add Contact Tag** `applied`; **Update Contact Field** → `Application Date` = today; **Update Opportunity** → stage `Applied`; then **If/Else** with TWO conditions combined: Branch `Qualified` requires **`Monthly Revenue` is any of `$2k-$5k` / `$5k-$15k` / `$15k+`** AND **`Commitment Level` is not `Just exploring`** (build it as condition groups in the If/Else panel; check each dropdown value spelling against A2). Qualified branch: **Add Contact Tag** `qualified`, **Update Opportunity** → `Qualified`, **Send Email** with the private `/book` link (warm, specific, 24-h framing), **Internal Notification** to the coach with the application answers merged in (`{{contact.monthly_revenue}}`, `{{contact.biggest_obstacle}}`). None/decline branch: **Add Contact Tag** `disqualified`, **Update Opportunity** → `Declined`, **Wait** → **2 hours** (an instant rejection feels robotic and cruel), **Send Email** — honest and kind: not a fit for the program right now, here are two free resources, reapply when revenue passes $2k; then **Add Contact Tag** `nurture`. Settings: **Allow Re-Entry ON** (reapplications welcome). **Publish**."
   },
   {
    "step": "C4 — Automation: call reminders and no-show recovery",
    "tool": "GHL",
    "detail": "New workflow `Call Reminders`. Trigger: **Appointment Status** → status is **Confirmed** + **In calendar** `Strategy Call`. Actions: **Add Contact Tag** `call-booked`; **Update Opportunity** → `Call Booked`; **Send Email** confirmation with `{{appointment.start_time}}` and 3 prep questions; **Wait** → **Event/Appointment Time** → **24 hours BEFORE** → **Send Email** + **Send SMS** reminder pair; **Wait** → Event/Appointment Time → **1 hour BEFORE** → **Send SMS** with the meeting link. Settings: **Stop on Response OFF**, **Publish**. Second workflow `Call No-Show Recovery`: trigger **Appointment Status** → status is **No-Show** + calendar `Strategy Call`. Actions: **Add Contact Tag** `call-noshow`; **Send SMS** within the minute (`Sorry we missed each other — want to grab a new time? [booking link]`); **Wait** → **1 day** → **Send Email** reschedule link; **Wait** → **3 days** → final email, then **Update Opportunity** → `Lost` if nothing books. Settings: **Stop on Response ON**, **Allow Re-Entry ON**, **Publish**."
   },
   {
    "step": "C5 — Automation: post-call nurture for non-buyers",
    "tool": "GHL",
    "detail": "New workflow `Post-Call Nurture`. Trigger: **Pipeline Stage Changed** → pipeline `Coaching Sales`, moved to `Offer Made` (the coach drags the card after each call). Actions: **Wait** → **1 day** → **If/Else** on **Tags includes `client`**: client branch exits immediately. None branch: **Send Email** recap-and-question email; **Wait** → **3 days** → **Send Email** objection-handling piece (honest FAQ, no pressure); **Wait** → **4 days** → **Send SMS** check-in; **Wait** → **7 days** → **Send Email** final door-open note, then **Update Opportunity** → `Lost` and **Add Contact Tag** `nurture`. Settings: **Stop on Response ON**, **Allow Re-Entry ON**, **Publish**."
   },
   {
    "step": "C6 — Automation: client onboarding + portal grant",
    "tool": "GHL",
    "detail": "New workflow `Client Onboarding`. Trigger: **Pipeline Stage Changed** → moved to `Won` (plus a second trigger **Opportunity Status Changed** → **Won**). Actions: **Add Contact Tag** `client`; **Remove Contact Tag** `nurture` and `qualified`; the portal grant: **+** → **Membership Grant Offer** (listed under Memberships actions) → select offer `Coaching Clients` — this emails their login credentials automatically; **Send Email** personal welcome from the coach (what happens in week 1, portal pointer); **Internal Notification** to the coach/VA to schedule the kickoff session; **Wait** → **3 days** → **If/Else** — if your plan exposes a membership-login condition use it, otherwise send a simple **Send Email** check-in (`Were you able to get into the portal? Reply if anything's stuck`). Settings: **Allow Re-Entry OFF**. **Publish**."
   },
   {
    "step": "T1 — Test: both application branches",
    "tool": "Test",
    "detail": "Register for the webinar in incognito as **Quinn Qualified** (`you+quinn@`), confirm the reminder ladder enrolls in **Execution Logs**. Apply via `/apply` answering `$5k-$15k` + `Ready now`: verify tag `qualified`, stage `Qualified`, the booking-link email, and the internal notification carrying the merged answers. Then apply as **Dana Declined** (`you+dana@`) answering `Pre-revenue` + `Just exploring`: verify stage `Declined`, the 2-hour **Wait**, and (after temporarily shrinking the wait to 2 minutes) the kind decline email. Confirm Dana never received the `/book` URL anywhere."
   },
   {
    "step": "T2 — Test: call lifecycle and the portal grant",
    "tool": "Test",
    "detail": "As Quinn, book a `Strategy Call` slot: confirm stage `Call Booked` and the anchored 24-h/1-h reminders parked in the logs. Mark the appointment **No-Show** in **Calendars** → **Appointments** and verify the instant reschedule SMS/email. Rebook, drag the card to `Offer Made`, and watch nurture start; then drag to `Won` and verify the big moment: `client` tag, **Membership Grant Offer** fires, and the portal welcome email with login arrives — log into the portal as Quinn to prove access end-to-end. Screenshot every canvas, the survey logic, the pipeline board, the portal lesson view, and one expanded execution log."
   }
  ],
  "dataModel": [
   "Pipeline `Coaching Sales`: Registered → Attended → Applied → Qualified → Call Booked → Call Held → Offer Made → Won / Lost / Declined",
   "Custom fields: `Monthly Revenue` (dropdown: Pre-revenue / Under $2k / $2k-$5k / $5k-$15k / $15k+), `Commitment Level` (dropdown: Ready now / Within 3 months / Just exploring), `Biggest Obstacle` (multi line), `Application Date` (date)",
   "Tags: `webinar-registered`, `webinar-attended`, `webinar-noshow`, `applied`, `qualified`, `disqualified`, `call-booked`, `call-noshow`, `client`, `nurture`, `replied`",
   "Calendar: `Strategy Call` — 45 min, 15 min buffer, Tue-Thu 10-3, 12 h notice, link private to the qualified branch",
   "Memberships: product `12-Week Program Portal` (3 categories), offer `Coaching Clients` granted by the Won workflow"
  ],
  "edgeCases": [
   "A2P 10DLC pending: the 1-hour and 15-minute webinar SMS pings are the highest-value sends in the system — register A2P first for a real client, and test to your own verified number meanwhile",
   "Borderline applicants: `$2k-$5k` + `Within 3 months` qualifies by the letter of the If/Else — decide with the client where the line sits and document the exact condition groups",
   "Reapplication: Allow Re-Entry ON on `Application Triage` and make the qualified branch remove `disqualified` (and vice versa) so tags never contradict each other",
   "Decline tone and DND: declined applicants must be able to opt out cleanly; keep the decline to email only (no SMS) and honor DND before any nurture sends",
   "Won mid-nurture: the `client` If/Else check in `Post-Call Nurture` must sit before every send — a paying client receiving a why-haven't-you-bought email is the worst bug this system can have"
  ],
  "acceptance": [
   "Client signs off when a webinar registration triggers the full reminder ladder (24 h email, 1 h SMS, 15 min SMS) verified in Execution Logs",
   "Client signs off when a qualifying application (revenue ≥ $2k, not just-exploring) gets the private booking link and an internal alert with the answers merged in",
   "Client signs off when a non-qualifying application lands in `Declined`, waits 2 hours, and receives the kind decline email — and never sees the booking URL",
   "Client signs off when booking a strategy call moves the card to `Call Booked` with anchored 24-h and 1-h reminders",
   "Client signs off when a call no-show gets the reschedule SMS within a minute and the 3-touch recovery runs unless they reply",
   "Client signs off when dragging a card to `Won` grants portal access automatically and the client can log in to see Week 1 content",
   "Client signs off when the pipeline board tells the whole story — registered through won/lost/declined — without opening a single contact"
  ],
  "portfolio": [
   "Loom (7-9 min): the full journey both ways — register, apply as qualified and book a call, then apply as unqualified and show the decline path; finish by dragging to `Won` and logging into the granted portal",
   "Screenshots: all six funnel pages, the survey with field mapping visible, the `Application Triage` If/Else condition groups, the pipeline board, the Memberships product tree, one expanded log",
   "A qualification-logic doc: the exact conditions, why declined ≠ lost, and how the client tunes the revenue threshold later",
   "Honest framing: demonstration build for a fictional coaching brand — placeholder curriculum, no earnings claims anywhere on the pages"
  ],
  "stretch": [
   "Replace the manual attended/no-show tagging with a Zoom-attendance import routine documented step-by-step, or trigger from an attendance form on the live event's exit",
   "Add a 5-email long-term nurture drip for the `nurture` tag with one value email per week and a quarterly reapplication invite",
   "Collect a deposit on the `Book` page by switching the calendar's Forms & Payment settings to require a refundable $100 payment to book"
  ]
 },
 {
  "id": "c23",
  "title": "Law-Firm Intake System",
  "industry": "Legal Services",
  "stack": "ghl",
  "difficulty": "intermediate",
  "hours": "8-12 h",
  "brief": [
   "We're a three-attorney firm — family law, estate planning, and small-business matters. Our intake is a shared inbox and a paralegal's memory. We get 50-60 inquiries a month and I genuinely don't know how many we lose because nobody replied fast enough or a consult never got scheduled.",
   "There are things about a law firm you have to respect: every new matter needs a conflict check before an attorney can talk specifics, each practice area needs different documents from the client before the consult, and about a third of booked consults get moved at least once. Right now rescheduling means email ping-pong that takes days.",
   "I want the entire intake system: a CRM that shows every matter from first contact through engagement — with a hard conflict-check gate — a booking page with a proper intake form, automatic document-checklist emails that match the practice area, consult reminders, something that catches reschedules instead of losing them, and a review request when a matter wraps up.",
   "Volumes: 50-60 inquiries/month across 3 practice areas, ~35 consults/month, average engagement $3,500. Keep all client-facing language professional — this is a law firm, not a gym."
  ],
  "painPoints": [
   "Inquiries sit in a shared inbox with no owner and no response-time standard",
   "No systematic conflict check step — it happens ad hoc and occasionally late",
   "Clients arrive at consults without the documents each practice area needs",
   "Cancelled/rescheduled consults are lost to email ping-pong",
   "Almost no Google reviews despite hundreds of satisfied closed matters"
  ],
  "whyStack": "GHL covers regulated-industry intake natively: Opportunities models the matter pipeline with an explicit `Conflict Check` stage, Custom Fields hold `Practice Area` and matter details, Forms builds the intake questionnaire with per-field mapping, Calendars books consults with reminder-friendly statuses, and Workflows branches document checklists by practice area with If/Else, runs the reminder ladder with appointment-anchored Waits, catches the Cancelled status for reschedule recovery, and fires review requests on matter close. Email-first messaging (appropriate for legal) sidesteps most A2P timing risk, and everything stays in one auditable platform.",
  "guide": [
   {
    "step": "A1 — CRM: matter pipeline with the conflict gate",
    "tool": "GHL",
    "detail": "**Opportunities** → **Pipelines** → **+ Create new pipeline**, name `Matter Intake`. Stages: `New Inquiry`, `Conflict Check`, `Cleared`, `Consult Booked`, `Consult Held`, `Engaged`, `Declined`, `Closed`. Click **+ Add Stage** for each, **Save**. The rule the whole firm follows: no consult confirmation goes out while a card sits in `Conflict Check` — the automation in C2 enforces it rather than trusting memory."
   },
   {
    "step": "A2 — CRM: matter fields and tags",
    "tool": "GHL",
    "detail": "**Settings** → **Custom Fields** → **+ Add Field**, folder `Matter Info`. Create `Practice Area` as **Dropdown (Single)**: `Family Law`, `Estate Planning`, `Business`. Create `Matter Description` as **Multi Line**, `Opposing Party` as **Single Line** (the conflict-check key), `Referred By` as **Single Line**, and `Matter Closed Date` as **Date**. Then **Settings** → **Tags**: `new-inquiry`, `conflict-pending`, `conflict-cleared`, `conflict-flagged`, `consult-booked`, `docs-sent`, `engaged`, `matter-closed`, `review-requested`, `replied`. Dropdown for practice area is non-negotiable — the document-checklist branching in C3 switches on its exact values."
   },
   {
    "step": "A3 — CRM: consult calendar per attorney",
    "tool": "GHL",
    "detail": "**Calendars** → **Calendar Settings** → **+ Create Calendar**, name `Initial Consult`, **Round Robin** across the three attorney users — then open the advanced settings and enable the option to let the round robin respect assigned users, so a family-law consult can be steered to the family attorney (or create three sibling calendars, one per attorney, if your plan behaves better that way; note which you chose and why). Duration **30 minutes**, buffer **15 minutes**, availability Mon-Fri **9:00 AM - 4:30 PM**, minimum notice **24 hours**. New bookings land as **Confirmed**."
   },
   {
    "step": "B1 — Funnel: consult booking page",
    "tool": "GHL",
    "detail": "**Sites** → **Funnels** → **+ New Funnel** → **From Blank**, name `Consult Booking`. Steps: `Request` (path `/consult`), `Schedule` (path `/schedule`), `Confirmed` (path `/confirmed`). Request-page sections: restrained hero (firm name, three practice areas, book-a-consultation CTA), attorney bios with credentials, how-a-consult-works section, a clearly worded disclaimer section (submitting this form does not create an attorney-client relationship — standard language, keep it visible), and the intake form. Typography and colors stay conservative; skim your reference pages for tone but dial the energy down."
   },
   {
    "step": "B2 — Funnel: intake form with full field mapping",
    "tool": "GHL",
    "detail": "**Sites** → **Forms** → **Builder** → **+ Add Form**, name `Matter Intake Form`. Fields in order: **First Name**, **Last Name**, **Email**, **Phone**, then custom-field elements mapped one-by-one: `Practice Area` (renders as the dropdown), `Matter Description` (multi-line, label it briefly describe your situation — do not include confidential details), `Opposing Party` (label: name of any other party involved, so the conflict check can run before the consult), `Referred By`. Verify every element's mapping in the right-hand panel — an unmapped `Opposing Party` breaks the conflict check silently. On Submit → redirect to `/confirmed` — NOT to the calendar. Booking comes after clearance; the confirmed page says: thank you, our team completes a brief conflict check (usually same business day), then you'll receive your scheduling link."
   },
   {
    "step": "B3 — Funnel: the gated scheduling page",
    "tool": "GHL",
    "detail": "Build the `Schedule` page: short copy (your conflict check is complete — choose a time below) and a **Calendar** element pointed at `Initial Consult`. Like the coaching build, this URL is only delivered by the cleared-branch email in C2, never linked publicly. **Save** and **Preview** both pages on mobile."
   },
   {
    "step": "C1 — Automation: inquiry intake and conflict-check queue",
    "tool": "GHL",
    "detail": "**Automation** → **+ Create Workflow** → **Start from Scratch**, name `Intake — New Inquiry`. Trigger: **Form Submitted** → filter **Form is** `Matter Intake Form`. Actions: **Add Contact Tag** `new-inquiry` and `conflict-pending`; **Create Opportunity** → pipeline `Matter Intake`, stage `Conflict Check`, name `{{contact.name}} — {{contact.practice_area}}` (pull `Practice Area` from the merge picker); **Send Email** acknowledgment (professional tone: received, conflict check underway, expect your scheduling link within one business day; repeat the no-attorney-client-relationship line); **Internal Notification** → **Email** to the paralegal with `Opposing Party` and `Matter Description` merged in and the instruction: run conflict check, then drag the card to `Cleared` or `Declined`. Then **Wait** → Time Delay → **1 day** → **If/Else** on **Tags includes `conflict-cleared`**: the None branch sends a second internal notification flagged OVERDUE — the SLA is enforcement by automation. Settings: **Allow Re-Entry ON**, **Stop on Response OFF**, and set the workflow's **time window** to business hours **8 AM - 6 PM Mon-Fri** for the client-facing sends. **Publish**."
   },
   {
    "step": "C2 — Automation: clearance gate",
    "tool": "GHL",
    "detail": "New workflow `Conflict Cleared`. Trigger: **Pipeline Stage Changed** → pipeline `Matter Intake`, moved to `Cleared`. Actions: **Remove Contact Tag** `conflict-pending`; **Add Contact Tag** `conflict-cleared`; **Send Email** with the private `/schedule` link (subject `You're cleared to schedule your consultation`), warm but formal, 3 what-to-expect bullets; **Wait** → **2 days** → **If/Else** on **Tags includes `consult-booked`**: None branch sends one polite scheduling reminder; **Wait** → **3 days** → second If/Else, None branch sends a final courtesy note and an internal notification to call. Mirror workflow `Conflict Declined`: trigger **Pipeline Stage Changed** → moved to `Declined` → **Add Contact Tag** `conflict-flagged` → **Internal Notification** to the responsible attorney to make the personal declination call (a conflict declination should come from a human, not a template — the workflow only ensures it happens). Both: **Publish**."
   },
   {
    "step": "C3 — Automation: booking + practice-area document checklists",
    "tool": "GHL",
    "detail": "New workflow `Consult Booked — Docs & Reminders`. Trigger: **Appointment Status** → status is **Confirmed** + **In calendar** `Initial Consult`. Actions: **Add Contact Tag** `consult-booked`; **Update Opportunity** → stage `Consult Booked`; **Send Email** booking confirmation with `{{appointment.start_time}}` and office/parking details; then the branch everyone will ask about in interviews — **If/Else** on **`Practice Area`**: Branch 1 condition **`Practice Area` is `Family Law`** → **Send Email** family checklist (marriage certificate, financial statements, any existing orders); Branch 2 **is `Estate Planning`** → **Send Email** estate checklist (asset list, prior wills/trusts, beneficiary info); Branch 3 **is `Business`** → **Send Email** business checklist (formation docs, contracts at issue, cap table if relevant). All three branches then merge into: **Add Contact Tag** `docs-sent`; **Wait** → **Event/Appointment Time** → **48 hours BEFORE** start → **Send Email** document reminder (`Bringing your documents makes the consult twice as productive`); **Wait** → Event/Appointment Time → **24 hours BEFORE** → **Send SMS** short reminder; **Wait** → Event/Appointment Time → **2 hours BEFORE** → **Send SMS** final. Settings: **Allow Re-Entry ON**, **Stop on Response OFF**. **Publish**."
   },
   {
    "step": "C4 — Automation: reschedule recovery",
    "tool": "GHL",
    "detail": "New workflow `Reschedule Recovery`. Trigger: **Appointment Status** → status is **Cancelled** + calendar `Initial Consult`. Actions: **Send Email** immediately (`No problem — here's your link to pick a new time`, with the `/schedule` link; tone: zero guilt, maximum ease); **Wait** → Time Delay → **2 days** → **If/Else** on **Tags includes `consult-booked`** — but first add a **Remove Contact Tag** `consult-booked` as the FIRST action of this workflow so the check reflects a NEW booking, not the old one (this ordering subtlety is the kind of thing that separates builders); None branch: **Send SMS** gentle nudge; **Wait** → **3 days** → final email + **Internal Notification** to the paralegal to call, and **Update Opportunity** back to `Cleared` so the board shows reality. Also handle **No-Show** with a sibling trigger on the same workflow (add a second trigger: **Appointment Status** → **No-Show**) since the recovery path is identical. Settings: **Stop on Response ON**, **Allow Re-Entry ON**. **Publish**."
   },
   {
    "step": "C5 — Automation: engagement and post-matter reviews",
    "tool": "GHL",
    "detail": "New workflow `Matter Closed — Review`. Trigger: **Pipeline Stage Changed** → pipeline `Matter Intake`, moved to `Closed`. Actions: **Add Contact Tag** `matter-closed`; **Update Contact Field** → `Matter Closed Date` = today; **Wait** → Time Delay → **3 days** (let the relief settle; never ask for a review the day a matter ends); **Send Email** thank-you from the attorney with a soft review invitation and the Google link (or the native **Send Review Request** action if **Reputation** → **Settings** is configured); **Wait** → **5 days** → **If/Else** on **Tags includes `review-requested`**-style completion — simplest robust version: apply `review-requested` right after the first ask, and the second touch is one SMS nudge only if they haven't replied (**Tags includes `replied`** is the check). Hard rule in the copy: never incentivize reviews and never gate by sentiment (review gating violates Google's policy — say this in your Loom, it reads as senior). Also: a small `Engaged` workflow — trigger **Pipeline Stage Changed** → `Engaged` → **Add Contact Tag** `engaged`, **Send Email** welcome-to-the-firm with next steps and billing expectations, **Internal Notification** to open the matter file. **Publish** both."
   },
   {
    "step": "T1 — Test: intake through the conflict gate",
    "tool": "Test",
    "detail": "Submit the intake form in incognito as **Ivy Intake** (`you+ivy@`), practice area `Estate Planning`, an `Opposing Party` value filled. Verify: acknowledgment email, card in `Conflict Check`, paralegal internal notification containing the merged `Opposing Party`, and — critically — that Ivy has NO scheduling link yet. Drag the card to `Cleared` and confirm the scheduling email arrives with the `/schedule` URL. Book a consult and verify the estate-planning checklist email specifically (not the family or business one) lands, then check **Execution Logs** to confirm the If/Else took the `Estate Planning` branch and the run is parked at the 48-h anchored **Wait**."
   },
   {
    "step": "T2 — Test: reschedule, close, and the overdue alarm",
    "tool": "Test",
    "detail": "Cancel Ivy's appointment in **Calendars** → **Appointments** and verify the instant new-time email and that `consult-booked` was removed before the 2-day check (shrink the Wait to 2 minutes to watch the nudge fire, then restore and re-**Publish**). Rebook, drag the card through `Consult Held` → `Engaged` (welcome email fires) → `Closed`, shrink the 3-day review Wait to test the review ask. Finally, submit a second test inquiry and do NOT clear it: shrink C1's 1-day Wait and confirm the OVERDUE internal notification fires. Screenshot every canvas, the three checklist emails, the pipeline board, and one expanded log."
   }
  ],
  "dataModel": [
   "Pipeline `Matter Intake`: New Inquiry → Conflict Check → Cleared → Consult Booked → Consult Held → Engaged → Declined / Closed",
   "Custom fields: `Practice Area` (dropdown: Family Law / Estate Planning / Business), `Matter Description` (multi line), `Opposing Party` (single line), `Referred By` (single line), `Matter Closed Date` (date)",
   "Tags: `new-inquiry`, `conflict-pending`, `conflict-cleared`, `conflict-flagged`, `consult-booked`, `docs-sent`, `engaged`, `matter-closed`, `review-requested`, `replied`",
   "Calendar: `Initial Consult` — 30 min + 15 min buffer, round robin across 3 attorneys, Mon-Fri 9-4:30, 24 h notice"
  ],
  "edgeCases": [
   "Conflict gate integrity: nothing client-facing may offer scheduling while `conflict-pending` is on the contact — the `/schedule` URL exists only inside the cleared-branch email",
   "Business-hours window: legal clients should never get a 9 PM SMS — set the workflow time window on all client-facing sends; internal SLA alerts stay 24/7",
   "Reschedule tag ordering: `Reschedule Recovery` must remove `consult-booked` first, or the 2-day If/Else reads the stale booking and never nudges",
   "DND/opt-out and tone: email is the primary channel; SMS is reminders-only, and any STOP reply must end SMS while the matter continues by email",
   "Duplicate contacts: spouses or business partners inquiring about the same matter create near-duplicates — keep Allow Duplicate Contact OFF and train the paralegal to merge rather than fork records"
  ],
  "acceptance": [
   "Client signs off when a form submission produces an acknowledgment, a `Conflict Check` card, and a paralegal alert with `Opposing Party` merged in — and no scheduling link",
   "Client signs off when dragging to `Cleared` releases the private scheduling email, and un-cleared inquiries trigger an OVERDUE internal alert after 1 business day",
   "Client signs off when booking a consult sends the correct practice-area document checklist (verified for all three areas) plus 48 h / 24 h / 2 h anchored reminders",
   "Client signs off when cancelling a consult produces an instant reschedule link and the 2-day nudge only fires if no new booking exists",
   "Client signs off when `Engaged` fires the welcome + internal matter-open alert, and `Closed` fires a review request 3 days later, never sooner",
   "Client signs off when every client-facing message respects the business-hours window and the disclaimer language appears on the intake page"
  ],
  "portfolio": [
   "Loom (5-7 min): submit an inquiry, show the conflict gate holding, clear it, book, receive the practice-area checklist, cancel and recover, close the matter and show the review timer — the full lifecycle in one take",
   "Screenshots: pipeline board with cards at multiple stages, intake form field mapping, the three-branch `Practice Area` If/Else, the reschedule workflow, one expanded execution log",
   "A one-page compliance note: the conflict-check gate, business-hours window, no review gating, disclaimer placement — shows you can build for a regulated client",
   "Present as a demonstration build for a fictional firm; use invented names throughout and say so in the video"
  ],
  "stretch": [
   "Add an engagement-letter step: on `Engaged`, send a Documents/e-sign request (GHL native documents & contracts feature) and only fire the welcome sequence when it's signed",
   "Per-attorney calendars with a `Practice Area` If/Else routing each cleared client to the right attorney's calendar link",
   "A quarterly dormant-file sweep: Contact Date Reminder on `Matter Closed Date` at 12 months for an estate-plan review-and-update invitation"
  ]
 },
 {
  "id": "c24",
  "title": "Med-Spa VIP System",
  "industry": "Med-Spa / Aesthetics",
  "stack": "ghl",
  "difficulty": "intermediate",
  "hours": "8-12 h",
  "brief": [
   "I own a med-spa doing about 350 treatments a month — injectables, laser, facials, body contouring. My front desk is drowning: every Botox client needs pre-care instructions before the visit and post-care after, and right now that's a paper handout half of them lose. Our rebooking is worse — Botox clients should be back every 10-12 weeks, but we wait for them to remember, and most don't.",
   "Two months ago I launched a $199/month VIP membership (a monthly facial credit plus 10% off everything) and I'm selling it verbally at checkout, tracking members in a notebook. I have 23 members and I've already lost track of who's paid. It's embarrassing.",
   "I want the whole system: a client CRM that knows what services each person has had and what tier they're on, a seasonal promo funnel we can re-skin four times a year, real online checkout for the membership with recurring billing, automatic pre-care and post-care messages matched to the treatment, a rebooking engine that brings people back on schedule, and reviews on autopilot.",
   "Numbers: ~350 treatments/month, ~900 active clients, 23 members now with a goal of 100, and our seasonal promos historically do 40-60 bookings in two weeks."
  ],
  "painPoints": [
   "Pre-care and post-care instructions are paper handouts that clients lose — occasional avoidable side effects and complaints",
   "No systematic rebooking: 10-12-week treatments drift to 16+ weeks or never",
   "Membership billing and roster tracked in a notebook — churn and missed payments invisible",
   "Seasonal promos rebuilt from scratch each time on a designer's timeline",
   "Reviews requested only when the front desk remembers, which is rarely"
  ],
  "whyStack": "Everything this spa needs ships in GHL: Custom Fields hold `Service History`, `Membership Tier`, and `Last Treatment Date`; Payments → Products handles the $199/month recurring membership with a native two-step order form for checkout; Funnels builds the re-skinnable seasonal promo page; Calendars books treatments; and Workflows keys pre-care/post-care sequences off service tags and appointment-anchored Waits, drives the 6-week/10-week rebooking cadence off the Contact Date Reminder trigger on `Last Treatment Date`, and runs the reputation engine off the Showed status. Recurring billing, pages, CRM, and messaging in one login — no Mindbody, no Mailchimp, no separate billing portal.",
  "guide": [
   {
    "step": "A1 — CRM: pipelines for promos and membership",
    "tool": "GHL",
    "detail": "**Opportunities** → **Pipelines** → **+ Create new pipeline**, name `Promo Bookings`, stages: `Claimed`, `Booked`, `Showed`, `Rebooked`, `Lapsed`. Create a second pipeline `Membership`, stages: `Interested`, `Checkout Started`, `Active Member`, `Payment Failed`, `Cancelled`. Click **+ Add Stage** for each and **Save**. The membership pipeline is what replaces the notebook — every member is a card, and billing events move the cards."
   },
   {
    "step": "A2 — CRM: service fields, tiers, and the tag taxonomy",
    "tool": "GHL",
    "detail": "**Settings** → **Custom Fields** → **+ Add Field**, folder `Spa Client`. Create `Service History` as **Checkbox** (multi-select): `Botox`, `Filler`, `Laser`, `Facial`, `Body Contouring` — checkbox type so one client can hold several. Create `Membership Tier` as **Dropdown (Single)**: `None`, `VIP`, `VIP Platinum`. Create `Last Treatment Date` as **Date** (the rebooking anchor) and `Skin Concerns` as **Multi Line**. Then **Settings** → **Tags**, service-event tags the automations key off: `svc-botox`, `svc-filler`, `svc-laser`, `svc-facial`, `member-vip`, `payment-failed`, `promo-spring`, `rebook-due`, `review-requested`, `replied`. Field = long-term profile, tag = event that fires automation — write that distinction in your build doc."
   },
   {
    "step": "A3 — CRM: treatment calendars",
    "tool": "GHL",
    "detail": "**Calendars** → **Calendar Settings** → **+ Create Calendar** twice: `Injectables` (Botox/filler — duration **30 minutes**, buffer **15**, availability Tue-Sat **9:00 AM - 5:30 PM**) and `Laser & Facials` (duration **60 minutes**, same availability). Auto-**Confirmed** on booking for both. Two calendars, not five: the pre-care branching in C2 happens on service tags, so calendars stay simple while messaging stays specific — a design decision worth explaining in your Loom."
   },
   {
    "step": "A4 — Setup: the recurring membership product",
    "tool": "Setup",
    "detail": "**Payments** → **Integrations** → connect **Stripe** (test mode for the demo). Then **Payments** → **Products** → **+ Create Product**: name `VIP Membership`, price type **Recurring**, **$199.00 / month**. Create `VIP Platinum` at **$349.00 / month** if you want the tier story complete. Recurring price type is the whole point — GHL + Stripe handle the monthly charge, and payment events (successful/failed) become workflow triggers in C5."
   },
   {
    "step": "B1 — Funnel: seasonal promo page",
    "tool": "GHL",
    "detail": "**Sites** → **Funnels** → **+ New Funnel** → **From Blank**, name `Seasonal Promo — Spring Glow`. Steps: `Offer` (path `/spring`), `Book` (path `/book`), `Thanks` (path `/thanks`). Offer-page sections: seasonal hero (offer headline, end date, CTA), the offer box (e.g. $99 signature facial, normally $150 — keep numbers plausible and clearly demo), before/after gallery placeholder labeled as stock/demo imagery, safety-and-credentials section (med-spa clients care), claim form. Build form `Spring Promo Claim` in the **Forms** builder: **Name**, **Email**, **Phone**, plus a custom-field element mapped to `Skin Concerns`, and a **hidden field** writing `promo-spring` into a promo-code field or applying via workflow. On Submit → redirect `/book`, where a **Calendar** element points at `Laser & Facials`. Re-skinning next season = duplicate funnel, change hero copy, dates, and the hidden value — 30 minutes, not a designer engagement."
   },
   {
    "step": "B2 — Funnel: membership sales + recurring checkout",
    "tool": "GHL",
    "detail": "New funnel `VIP Membership`, steps `Join` (path `/vip`) and `Welcome` (path `/vip-welcome`). Join-page sections: value stack (monthly facial credit, 10% off all services, priority booking), simple price presentation ($199/month, cancel anytime — honest terms build trust and reduce churn drama), FAQ, then the checkout: drag on the **Order Form** element (two-step), attach product `VIP Membership` (the recurring one) in the step's **Products** tab. Confirmation redirects to `/vip-welcome`: what happens next, how the monthly credit works, and a **Calendar** element to book the first member facial on the spot."
   },
   {
    "step": "C1 — Automation: promo claim and booking push",
    "tool": "GHL",
    "detail": "**Automation** → **+ Create Workflow** → **Start from Scratch**, name `Promo — Spring Claim`. Trigger: **Form Submitted** → filter **Form is** `Spring Promo Claim`. Actions: **Add Contact Tag** `promo-spring`; **Create Opportunity** → pipeline `Promo Bookings`, stage `Claimed`; **Send Email** claim confirmation with the `/book` link and the promo end date; **Send SMS** short version; **Wait** → Time Delay → **1 day** → **If/Else** on **Tags includes `svc-facial`**-style booking evidence — cleaner: check **Appointment**-driven tag from C2, or simply **If/Else** on opportunity stage via **Tags includes `promo-booked`** (have C2 apply `promo-booked` when a `promo-spring` contact books): None branch sends nudge email day 1; **Wait** → **2 days** → SMS nudge; **Wait** → **3 days** → last-chance email 48 h before the promo ends, then move the card to `Lapsed` if still unbooked. Settings: **Allow Re-Entry ON** (they can claim the summer promo later), **Stop on Response OFF**, business-hours **time window 9 AM - 7 PM**. **Publish**."
   },
   {
    "step": "C2 — Automation: booking intake + pre-care by service",
    "tool": "GHL",
    "detail": "New workflow `Booking — Pre-Care`. Trigger: **Appointment Status** → status is **Confirmed**, two trigger entries so BOTH calendars feed it (add the trigger twice, once filtered **In calendar** `Injectables`, once `Laser & Facials`). Actions: **Update Opportunity** → `Booked` (for promo claimants); **If/Else** on the front desk's service tag — the desk (or the booking form's service dropdown) applies `svc-botox` / `svc-laser` / `svc-facial` at booking: Branch `svc-botox` → **Send Email** Botox pre-care (avoid blood thinners and alcohol 24 h prior, no ibuprofen, arrive makeup-free — standard instructions, phrased as from-your-provider); Branch `svc-laser` → laser pre-care (no sun exposure 2 weeks prior, stop retinoids 5 days prior); Branch `svc-facial`/None → general prep note. All branches merge into: **Wait** → **Event/Appointment Time** → **24 hours BEFORE** start → **Send SMS** reminder with the service-specific one-liner; **Wait** → Event/Appointment Time → **2 hours BEFORE** → **Send SMS** final. Settings: **Allow Re-Entry ON** (clients book monthly), **Stop on Response OFF**. **Publish**."
   },
   {
    "step": "C3 — Automation: post-care + review engine",
    "tool": "GHL",
    "detail": "New workflow `Post-Care & Reviews`. Trigger: **Appointment Status** → status is **Showed** (both calendars, two trigger entries as before). Actions: **Update Contact Field** → `Last Treatment Date` = today (this single line arms the entire rebooking engine); **Update Opportunity** → `Showed`; **If/Else** on service tags: `svc-botox` branch → **Send Email** post-care within the hour (no lying down 4 h, no exercise 24 h, when results appear, when to call us); `svc-laser` branch → laser aftercare (SPF religiously, expected redness timeline); facial/None branch → light aftercare note. Merge into: **Wait** → Time Delay → **2 days** → **Send SMS** how-are-you-feeling check-in (`Any questions about your treatment? Just reply here`); **Wait** → **2 days** → the review ask — **Send Review Request** if **Reputation** → **Settings** is wired, else **Send SMS** with the Google link — then **Add Contact Tag** `review-requested`. Never send the review ask on treatment day (swelling day is not review day — say this in the Loom). Settings: **Stop on Response ON** for the check-in leg, **Allow Re-Entry ON**. **Publish**."
   },
   {
    "step": "C4 — Automation: the rebooking cadence",
    "tool": "GHL",
    "detail": "New workflow `Rebooking Engine`. Trigger: **Add New Trigger** → **Contact Date Reminder** → field `Last Treatment Date` → **6 weeks AFTER** the date. Actions: **If/Else** on **Tags includes `svc-botox`**: the Botox branch waits — add a **Wait** → Time Delay → **4 weeks** (Botox cadence is ~10-12 weeks, so 6-week trigger + 4-week wait lands at week 10) then **Send SMS** (`{{contact.first_name}}, it's about time for your next visit — your usual slot? Book here: [link]`); the facial/laser branch sends the rebook nudge immediately at 6 weeks. Both branches then: **Add Contact Tag** `rebook-due`; **Wait** → **5 days** → **If/Else** on a fresh booking (C2 can apply a `rebooked` tag; check **Tags includes `rebooked`**): None branch sends an email with a small members-get-priority nudge; **Wait** → **7 days** → final SMS, then move/create the opportunity card to `Lapsed` for the front-desk call list. Important: a new visit re-stamps `Last Treatment Date`, which re-arms the trigger — the loop is self-sustaining. Settings: **Allow Re-Entry ON** (mandatory here), time window 9-7. **Publish**."
   },
   {
    "step": "C5 — Automation: membership lifecycle",
    "tool": "GHL",
    "detail": "New workflow `VIP Membership Lifecycle`. Trigger: **Order Form Submission** filtered to the `VIP Membership` funnel step (add a **Payment Received** trigger filtered by product `VIP Membership` as a second entry if your account exposes it). Actions: **Add Contact Tag** `member-vip`; **Update Contact Field** → `Membership Tier` = `VIP`; **Create Opportunity** → pipeline `Membership`, stage `Active Member`, value 199; **Send Email** member welcome (how the credit works, the private booking priority line); **Send SMS** short welcome; **Wait** → **30 days** → **Send Email** month-one check-in (used your facial credit yet?). Sibling workflow `Payment Failed Rescue`: trigger the payments/invoice **Payment Failed** event (check **Automation** trigger list under Payments — name varies by release) filtered to the membership product → **Add Contact Tag** `payment-failed`; **Update Opportunity** → `Payment Failed`; **Send Email** gentle card-update request with the update link; **Wait** → **3 days** → **If/Else** on tag removal/payment success → None branch: **Send SMS** + **Internal Notification** to the front desk to call before cancelling. Settings: **Allow Re-Entry ON** on the rescue. **Publish** both."
   },
   {
    "step": "T1 — Test: promo claim through treatment day",
    "tool": "Test",
    "detail": "Claim the spring promo in incognito as **Sasha Spa** (`you+sasha@`, your phone), verify the claim email, the `Claimed` card, and book through `/book`. Have the front-desk step: apply `svc-facial` to Sasha, then confirm the facial pre-care branch fired (check the If/Else path in **Execution Logs**) and the run parked at the 24-h anchored **Wait**. Mark the appointment **Showed** and verify: `Last Treatment Date` stamped today, post-care email, and — after shrinking the 2-day Waits to minutes — the check-in SMS and review ask in order. Restore real durations and re-**Publish**."
   },
   {
    "step": "T2 — Test: rebooking loop and recurring checkout",
    "tool": "Test",
    "detail": "Test the rebooking engine by editing the **Contact Date Reminder** to **1 day AFTER** `Last Treatment Date`, setting Sasha's date to yesterday, and confirming the facial-branch nudge fires immediately while a second contact tagged `svc-botox` takes the delayed branch (shrink its 4-week Wait to 2 minutes to see it). Reset the trigger to 6 weeks. Then buy the membership at `/vip` with Stripe test card `4242 4242 4242 4242`: verify recurring subscription in Stripe test dashboard, `member-vip` tag, `Membership Tier` = `VIP`, the `Active Member` card, and the welcome pair. Screenshot both funnels, all five canvases, the two pipelines, the recurring product config, and one expanded log."
   }
  ],
  "dataModel": [
   "Pipeline `Promo Bookings`: Claimed → Booked → Showed → Rebooked → Lapsed",
   "Pipeline `Membership`: Interested → Checkout Started → Active Member → Payment Failed → Cancelled",
   "Custom fields: `Service History` (checkbox multi: Botox / Filler / Laser / Facial / Body Contouring), `Membership Tier` (dropdown: None / VIP / VIP Platinum), `Last Treatment Date` (date), `Skin Concerns` (multi line)",
   "Tags: `svc-botox`, `svc-filler`, `svc-laser`, `svc-facial`, `member-vip`, `payment-failed`, `promo-spring`, `promo-booked`, `rebooked`, `rebook-due`, `review-requested`, `replied`",
   "Calendars: `Injectables` (30 min + 15 buffer), `Laser & Facials` (60 min), Tue-Sat 9-5:30, auto-confirm ON",
   "Products: `VIP Membership` $199/month recurring, `VIP Platinum` $349/month recurring"
  ],
  "edgeCases": [
   "A2P 10DLC pending: pre-care SMS carries real safety-adjacent info, so every SMS branch needs an email sibling until A2P is approved — and after, keep both",
   "DND/opt-out: a client who texts STOP must still receive post-care instructions — route safety-relevant content via email always, SMS as the convenience layer",
   "Rebooking re-entry: Contact Date Reminder re-fires each time `Last Treatment Date` is re-stamped — Allow Re-Entry ON is mandatory, and the `rebooked`/`rebook-due` tag pair must be cleaned up on each new visit or nudges misfire",
   "Multi-service clients: someone tagged both `svc-botox` and `svc-facial` will match the first If/Else branch only — order branches by clinical priority (injectables first) and document it",
   "Failed membership payments: never auto-cancel on first failure — the rescue workflow gives 3 days + a human call before anyone touches the subscription"
  ],
  "acceptance": [
   "Client signs off when a promo claim produces the confirmation pair, a `Claimed` card, and day-1/day-3 nudges that stop once a booking exists",
   "Client signs off when a booking tagged `svc-botox` receives Botox pre-care and one tagged `svc-laser` receives laser pre-care — verified as different emails in the same workflow's logs",
   "Client signs off when marking **Showed** stamps `Last Treatment Date`, sends the matching post-care, and schedules the day-2 check-in and day-4 review ask",
   "Client signs off when the rebooking nudge fires at 6 weeks for facials and ~10 weeks for Botox, and a new booking cleanly exits the nudge ladder",
   "Client signs off when the membership checkout creates a live recurring subscription in Stripe test mode, sets `Membership Tier`, and cards the member as `Active Member`",
   "Client signs off when a simulated failed payment triggers the rescue email and a front-desk call task before any cancellation",
   "Client signs off when next season's promo can be cloned and live in under an hour by a non-technical staff member following the runbook"
  ],
  "portfolio": [
   "Loom (6-8 min): claim the promo live, book, show pre-care arriving, mark Showed, show post-care + review timers, then buy the membership with a test card and show the recurring subscription and pipeline card — funnel to CRM to automation, end to end",
   "Screenshots: promo and membership funnels, both pipelines with cards, the service-tag If/Else canvas, the Contact Date Reminder trigger config, the recurring product, one expanded log",
   "The seasonal-promo runbook: the exact 6 edits that re-skin the funnel each quarter",
   "Honest framing: demonstration build for a fictional spa, test-mode billing, stock imagery labeled as such, no medical outcome claims anywhere"
  ],
  "stretch": [
   "Tier upgrade path: a workflow that notices 3+ visits in 90 days on a non-member and sends a personalized membership pitch with the math of what they'd have saved",
   "Add the front-desk service-tag step to the booking form itself (service dropdown mapped to a field, workflow converts field → tag) to remove the manual tagging",
   "Birthday campaign: Contact Date Reminder on date-of-birth for a members-get-more birthday offer"
  ]
 },
 {
  "id": "c25",
  "title": "Course Launch System",
  "industry": "Online Education / Creator",
  "stack": "ghl",
  "difficulty": "advanced",
  "hours": "12-16 h",
  "brief": [
   "I'm a creator with an email list of about 9,000 and I sell a $297 course on freelance copywriting twice a year. My launches are duct tape: ConvertKit for email, ThriveCart for checkout, Teachable for the course, three Zapier zaps holding it together — and every launch one of the zaps breaks mid-cart-open and I spend launch night debugging instead of selling.",
   "My last launch did 118 sales, but I know the machine leaked: no SMS at cart close (my single biggest sales window), the upsell was a PayPal link in a follow-up email that maybe 4 people clicked, and buyers waited up to an hour for course access because the Teachable zap ran on a delay. People literally emailed asking if they'd been scammed. During launch week.",
   "I want the whole thing rebuilt on one platform before my fall launch: proper lead-magnet opt-ins that segment people from day one, the full funnel — opt-in, sales page, checkout with an order bump, a real one-click-feeling upsell page — the course itself hosted in the same system with INSTANT access on purchase, a launch sequence with my 5 emails and 3 SMS on exact timing, cart-close countdown automation, and onboarding that actually gets people into module 1.",
   "Design for: 9,000-contact list imported with tags, ~2,500 launch-sequence recipients, 100-150 sales in a 5-day cart window, upsell target 20% take rate."
  ],
  "painPoints": [
   "Four tools and three Zaps — something breaks every single launch, always at the worst moment",
   "Course access delayed up to an hour after purchase; buyers email asking if it's a scam",
   "No SMS in the launch stack despite cart-close being the biggest revenue window",
   "Upsell is a PayPal link in an email — effectively zero take rate",
   "List is one undifferentiated blob: webinar people and checklist people get identical pitches"
  ],
  "whyStack": "This build retires four subscriptions: Funnels handles opt-in → sales → two-step order form with an order bump → upsell → thank-you; Payments → Products defines the course, bump, and upsell prices; the native Memberships area hosts the course and a workflow's Membership Grant Offer action delivers access the second Stripe confirms payment — instantly, no Zapier hop; Workflows sends the 5-email/3-SMS launch sequence on exact timing with tag-based segmentation from the lead magnets; and cart-close is just a scheduled branch of the same engine. One platform means launch night has one status page, not four.",
  "guide": [
   {
    "step": "A1 — CRM: audience segmentation model",
    "tool": "GHL",
    "detail": "**Settings** → **Tags** → **+ New Tag** for the full launch taxonomy before anything else: lead-magnet tags `lm-headline-checklist` and `lm-pricing-webinar` (which magnet they came through), lifecycle tags `launch-fall26`, `cart-open`, `purchased`, `bump-buyer`, `upsell-buyer`, `onboarded`, `module1-complete`, `nonbuyer-fall26`, `replied`. Then **Settings** → **Custom Fields**, folder `Audience`: `Copywriting Level` as **Dropdown (Single)** (`Brand new`, `Some clients`, `Full-time`), `Lead Magnet Source` as **Dropdown (Single)** (`Checklist`, `Webinar`, `Import`). Tag = event, field = profile; the launch emails personalize on the field, the workflows branch on the tags."
   },
   {
    "step": "A2 — CRM: launch pipeline",
    "tool": "GHL",
    "detail": "**Opportunities** → **Pipelines** → **+ Create new pipeline**, name `Fall Launch`, stages: `Lead`, `Engaged`, `Cart Open Clicked`, `Purchased`, `Upsell Taken`, `Refunded`. **Save**. A course launch doesn't need a heavyweight pipeline, but the owner wants one glanceable board on launch night — cards move automatically via Phase C, nobody drags anything by hand during a launch."
   },
   {
    "step": "A3 — Setup: products and prices",
    "tool": "Setup",
    "detail": "**Payments** → **Integrations** → connect **Stripe** (test mode for the demo). **Payments** → **Products** → **+ Create Product** three times: `Copy Course` one-time **$297.00**; `Swipe File Vault` one-time **$47.00** (the order bump); `Launch Client in 30 Days` one-time **$97.00** (the upsell). Three separate products — take rates per product are the launch metrics that matter."
   },
   {
    "step": "A4 — CRM: build the course in Memberships",
    "tool": "GHL",
    "detail": "**Memberships** → **Products** → **+ Create Product**, name `Freelance Copy Course`. Categories: `Start Here`, `Module 1 — Offers`, `Module 2 — Copy`, `Module 3 — Clients`, plus a locked `Bonus — Launch Client in 30 Days` category for the upsell content. Add placeholder lessons via **+ New Post** (video placeholder + description each). In **Offers**: create offer `Course Access` containing the product with the bonus category excluded via the offer's access settings, and a second offer `Course + Bonus` including everything. Two offers, one product — the upsell purchase simply grants the bigger offer."
   },
   {
    "step": "B1 — Funnel: lead-magnet opt-in pages",
    "tool": "GHL",
    "detail": "**Sites** → **Funnels** → **+ New Funnel**, name `Launch Funnel`. Steps: `Optin Checklist` (path `/checklist`), `Optin Webinar` (path `/pricing-webinar`), `Sales` (path `/course`), `Checkout` (path `/enroll`), `Upsell` (path `/one-more-thing`), `Thanks` (path `/welcome`). Build two small forms in the **Forms** builder: `Checklist Optin` and `Webinar Optin`, each **First Name**, **Email**, **Phone** (label phone as optional-but-for-launch-texts — consent language matters), each with a hidden field writing `Lead Magnet Source`. Opt-in page structure: one promise headline, 3 bullets, form, delivery note. On Submit → redirect to a simple delivery section on the same page or `/thanks`-style confirmation."
   },
   {
    "step": "B2 — Funnel: sales page and two-step checkout with bump",
    "tool": "GHL",
    "detail": "Sales-page (`/course`) section outline: hero (promise + cart-close date), the-problem narrative block, curriculum walk (mirror the 3 module names from A4 exactly), instructor-credibility section (honest bio, no income claims), student-results section labeled as demo placeholders in this build, price stack, guarantee terms, FAQ, final CTA — every CTA button set to go to `/enroll`. On `Checkout`: **Order Form** element, **two-step** mode, attach `Copy Course` ($297) as the product; enable the **Order Bump** with `Swipe File Vault` ($47), bump headline `Add 200+ proven swipe files for $47?`. Set the order form's confirmation redirect to `/one-more-thing` — the upsell page, not the thank-you."
   },
   {
    "step": "B3 — Funnel: upsell page and thank-you",
    "tool": "GHL",
    "detail": "On `Upsell` (`/one-more-thing`): headline (`Your course is ready — one question first`), short pitch for `Launch Client in 30 Days` ($97), a second **Order Form** (or upsell element if your funnel step type offers the native one-click upsell — check the step's **Products** tab for the upsell toggle; card-on-file one-click is the goal, a standard second order form is the fallback), and a clearly visible **No thanks, take me to my course** link to `/welcome`. On `Thanks` (`/welcome`): your-login-is-in-your-inbox instructions, a start-module-1-now button to the portal URL, and what-to-expect-this-week."
   },
   {
    "step": "C1 — Automation: lead-magnet delivery and segmentation",
    "tool": "GHL",
    "detail": "**Automation** → **+ Create Workflow** → **Start from Scratch**, name `Lead Magnet — Checklist`. Trigger: **Form Submitted** → filter **Form is** `Checklist Optin`. Actions: **Add Contact Tag** `lm-headline-checklist`; **Update Contact Field** → `Lead Magnet Source` = `Checklist`; **Send Email** delivering the checklist (link or attachment) with a P.S. seeding the course; **Wait** → Time Delay → **2 days** → **Send Email** value follow-up (best headline teardown); **Wait** → **3 days** → **Send Email** soft course mention. Duplicate the workflow as `Lead Magnet — Webinar` with the `Webinar Optin` filter, `lm-pricing-webinar` tag, and webinar-flavored copy. Settings on both: **Allow Re-Entry OFF** (one delivery per contact), **Stop on Response OFF**. **Publish** both."
   },
   {
    "step": "C2 — Automation: the launch sequence — 5 emails + 3 SMS on exact timing",
    "tool": "GHL",
    "detail": "New workflow `Fall Launch Sequence`. Trigger: **Contact Tag** → **Tag Added** → `launch-fall26` (you bulk-apply this tag to the chosen segment from **Contacts** → Smart List → bulk action the day the sequence starts — the tag IS the launch button). Actions, with every **Wait** as Time Delay sized so sends land at 9:00 AM in the client's timezone (set the workflow **time window** to 9 AM - 8 PM as the guardrail): Email 1 Day 0 9 AM — story + cart opens tomorrow; **Wait 1 day** → Email 2 Day 1 9 AM — CART OPEN + **Add Contact Tag** `cart-open` + SMS 1 Day 1 9:05 AM (`Doors are open: [link to /course]` — sent only to contacts with phone consent); **Wait 1 day** → Email 3 Day 2 — objections/FAQ; **Wait 1 day** → Email 4 Day 3 — full curriculum walk + bump mention; **Wait 1 day** → Email 5 Day 4 9 AM — closes-tomorrow warning; then the cart-close crescendo: **Wait 1 day** → SMS 2 Day 5 10 AM (`Last day for Copy Course — closes midnight: [link]`), **Wait** → **9 hours** → SMS 3 Day 5 7 PM final-hours message, **Wait** → **5 hours** → a **Send Email** doors-closed-graceful at midnight, then **Add Contact Tag** `nonbuyer-fall26`. Wrap EVERY send in the buyer check: **If/Else** on **Tags includes `purchased`** before each message — buyers exit to nothing; nobody who bought on Day 1 may receive a Day 5 scarcity SMS. Settings: **Allow Re-Entry OFF** for this launch, **Stop on Response OFF** (replies go to the inbox, sequence continues). **Publish**."
   },
   {
    "step": "C3 — Automation: purchase → instant access + bump/upsell handling",
    "tool": "GHL",
    "detail": "New workflow `Purchase — Instant Access`. Trigger: **Order Form Submission** filtered to the `Checkout` step (add **Payment Received** filtered by product `Copy Course` as a second trigger entry for belt-and-braces). Actions, in this exact order because speed is the brief: FIRST **Membership Grant Offer** → `Course Access` (login email goes out within seconds — this is the line that fixes the am-I-scammed problem, put it before everything); then **Add Contact Tag** `purchased`; **Remove Contact Tag** `cart-open`; **Update Opportunity** → stage `Purchased` (Create/Update against the `Fall Launch` pipeline); **If/Else** on the bump — condition on the order containing `Swipe File Vault` if your trigger filters expose product line-items, else a sibling **Payment Received** helper filtered by the bump product that applies `bump-buyer`: bump branch adds tag `bump-buyer` and sends the swipe-file delivery email; **Send Email** welcome (what you bought, login pointer, start-here link); **Send SMS** short welcome. Sibling workflow `Upsell Purchase`: trigger **Order Form Submission**/**Payment Received** filtered to `Launch Client in 30 Days` → **Membership Grant Offer** → swap to `Course + Bonus` → **Add Contact Tag** `upsell-buyer` → **Update Opportunity** → `Upsell Taken`. Settings: **Allow Re-Entry OFF**. **Publish** both."
   },
   {
    "step": "C4 — Automation: post-purchase onboarding",
    "tool": "GHL",
    "detail": "New workflow `Course Onboarding`. Trigger: **Contact Tag** → **Tag Added** → `purchased`. Actions: **Wait** → Time Delay → **1 day** → **Send Email** did-you-log-in check with the portal link (if your plan exposes a membership login/lesson-completed trigger or condition, branch on it; otherwise keep it a plain nudge and say so honestly in the build doc); **Wait** → **2 days** → **Send Email** module-1 momentum email (the single most important lesson, 20 minutes, do it today) + **Send SMS** matching nudge; **Wait** → **4 days** → **If/Else** on **Tags includes `module1-complete`** (applied by a Memberships product-completion automation if available, or manually in the demo): None branch sends the stuck-on-something email with a reply prompt; **Wait** → **7 days** → **Send Email** week-2 roadmap + testimonial-request seed (honest ask, no incentive). Settings: **Allow Re-Entry OFF**, **Stop on Response ON** for the stuck-check leg. **Publish**."
   },
   {
    "step": "C5 — Automation: cart-close hygiene and non-buyer path",
    "tool": "GHL",
    "detail": "New workflow `Post-Launch Wrap`. Trigger: **Contact Tag** → **Tag Added** → `nonbuyer-fall26` (applied by the last step of C2). Actions: **Wait** → Time Delay → **2 days** → **Send Email** no-pitch value email (the best free resources recap — goodwill after a launch week matters); **Wait** → **5 days** → **Send Email** honest survey ask (one question: what held you back? mapped reply or a simple **Survey** built in **Sites** → **Surveys** writing to a `Launch Objection` custom field); **Add Contact Tag** cleanup: **Remove Contact Tag** `launch-fall26` and `cart-open` so the list is clean for spring. Also build the refund path: trigger on the payments refund event if exposed (or a manual `refunded` tag) → **Remove Contact Tag** `purchased` → revoke access via the Memberships remove-offer action → **Update Opportunity** → `Refunded` → a graceful sorry-it-wasn't-a-fit email. Settings: **Allow Re-Entry ON** for the wrap (next launch reuses it with a new tag). **Publish**."
   },
   {
    "step": "T1 — Test: opt-in, sequence timing, and the buyer-exit check",
    "tool": "Test",
    "detail": "Opt in at `/checklist` as **Lena Launch** (`you+lena@`) and verify the delivery email + `lm-headline-checklist` tag. Apply `launch-fall26` to Lena manually, then temporarily compress every Wait in `Fall Launch Sequence` (1 day → 2 minutes, 9 h → 2 min, 5 h → 1 min), re-**Publish**, and watch all 5 emails and 3 SMS arrive in order with correct content in **Execution Logs**. Then the critical test: apply `launch-fall26` to a second contact, let two messages send, apply `purchased` mid-sequence, and verify every remaining If/Else routes them OUT — zero further sends. Restore all real durations and re-**Publish**."
   },
   {
    "step": "T2 — Test: the money path end-to-end",
    "tool": "Test",
    "detail": "Buy at `/enroll` with Stripe test card `4242 4242 4242 4242`, bump ticked: charge shows $344 in Stripe test mode; confirm the **Membership Grant Offer** login email arrives within a minute (time it — instant access is the headline claim), tags `purchased` + `bump-buyer` land, the card hits `Purchased`, and you land on `/one-more-thing`. Take the upsell: verify $97 charge, `upsell-buyer`, offer swap to `Course + Bonus`, and that the bonus category is now visible when you log into the portal as Lena. Decline path: run a second buyer, click **No thanks**, and confirm they reach `/welcome` with course-only access. Finally test onboarding by compressing C4's waits. Screenshot: full funnel map, every canvas, the Memberships tree with the locked bonus category, the Stripe test charges, the pipeline board, one expanded log of the full purchase run."
   }
  ],
  "dataModel": [
   "Pipeline `Fall Launch`: Lead → Engaged → Cart Open Clicked → Purchased → Upsell Taken → Refunded",
   "Custom fields: `Copywriting Level` (dropdown: Brand new / Some clients / Full-time), `Lead Magnet Source` (dropdown: Checklist / Webinar / Import), `Launch Objection` (multi line, survey-fed)",
   "Tags: `lm-headline-checklist`, `lm-pricing-webinar`, `launch-fall26`, `cart-open`, `purchased`, `bump-buyer`, `upsell-buyer`, `onboarded`, `module1-complete`, `nonbuyer-fall26`, `refunded`, `replied`",
   "Products: `Copy Course` $297, `Swipe File Vault` $47 (bump), `Launch Client in 30 Days` $97 (upsell)",
   "Memberships: product `Freelance Copy Course` (4 categories + locked bonus), offers `Course Access` and `Course + Bonus`"
  ],
  "edgeCases": [
   "A2P 10DLC: the 3 launch SMS are the highest-leverage sends — A2P registration must be complete BEFORE launch week, not during; in the demo, test to your own verified number and show the send attempts in logs",
   "Buyer mid-sequence: the `purchased` If/Else guard before every C2 send is non-negotiable — a Day-1 buyer receiving Day-5 scarcity SMS is the fastest way to a refund and a public complaint",
   "SMS consent: only contacts who gave a phone number on an opt-in form with the launch-texts label get SMS — filter the SMS steps on phone-exists AND respect DND the moment anyone replies STOP",
   "Re-entry across launches: C2 is Allow Re-Entry OFF for this launch, but spring reuses the machine — the wrap workflow's tag cleanup (`launch-fall26`, `cart-open` removed) is what makes the next launch safe",
   "Duplicate purchase: an excited buyer double-submitting the order form must not get two grants or two charges — Allow Re-Entry OFF on the purchase workflow and check Stripe test mode for the single charge"
  ],
  "acceptance": [
   "Client signs off when each lead magnet delivers instantly and stamps its segmentation tag and `Lead Magnet Source` correctly",
   "Client signs off when applying `launch-fall26` to a test cohort runs 5 emails + 3 SMS in the exact configured order and timing (verified compressed, then restored)",
   "Client signs off when a contact who purchases mid-sequence receives zero further launch messages",
   "Client signs off when a test purchase delivers portal login within one minute of payment — timed and shown on screen",
   "Client signs off when the bump adds $47 to the same charge and the upsell purchase upgrades access to the bonus category without human touch",
   "Client signs off when declining the upsell still lands the buyer on the welcome page with working course-only access",
   "Client signs off when post-launch cleanup leaves the list re-launchable: no stale `cart-open`/`launch-fall26` tags on anyone"
  ],
  "portfolio": [
   "Loom (7-10 min): the full customer journey live — opt in, receive the magnet, get launch emails, buy with a test card including the bump, take the upsell, log into the course within a minute of paying — then flip to the back end and walk the sequence canvas with its buyer-exit guards",
   "Screenshots: all six funnel pages, the launch-sequence canvas end to end, the purchase workflow with Membership Grant Offer first, the Memberships tree, Stripe test charges, the pipeline board on 'launch night'",
   "A launch-day runbook: the bulk-tag step that starts the sequence, what to monitor hourly, and the rollback move if a send misfires",
   "Frame it straight: a demonstration build with test-mode payments and placeholder curriculum — the 118-sales backstory is the fictional client's, not a claim about this build"
  ],
  "stretch": [
   "Segment Email 3 by `Lead Magnet Source` with an If/Else: checklist people get the objection email framed around headlines, webinar people around pricing",
   "Add a deadline-driven evergreen variant: swap the bulk-tag trigger for the opt-in tag + a fixed 5-day countdown per contact, and document the integrity rule (a real close means really closing)",
   "Wire a `Cart Open Clicked` stage move using a trigger link (**Marketing** → **Trigger Links**) on the Email 2 CTA so the pipeline shows engagement, not just sends"
  ]
 },
 {
  "id": "c26",
  "title": "Portal to Pipeline: Real-Estate Buyer/Seller Engine",
  "industry": "residential real estate brokerage",
  "stack": "ghl+n8n",
  "difficulty": "advanced",
  "hours": "12-18 h",
  "brief": [
   "I run Harbor & Pine Realty — six agents, one office, and we close 8-12 transactions a month. Our lead flow is a mess of three sources: about 250 portal leads a month arrive as notification EMAILS from Zillow and Realtor.com into a shared inbox (nobody 'owns' them, and by the time an agent copies one into a spreadsheet the buyer has talked to two other brokerages), roughly 40 people a month ask 'what's my home worth' through whatever landing page our old marketing guy left behind, and buyers who want our neighborhood guide just... email us.",
   "Speed is everything in this business. Industry data says a portal lead contacted inside 5 minutes is many times more likely to convert, and right now our median first response is over 3 hours because a human has to notice the email first. We also treat a $300k first-time buyer and a pre-approved $1.2M buyer identically, which is insane — my senior agents should be on the expensive, pre-approved leads within minutes.",
   "I want one complete system: a real CRM with separate Buyer and Seller pipelines and the fields that actually matter to us (budget, target area, pre-approval status), a home-valuation funnel for sellers and a buyer-guide funnel for buyers, automatic instant text-back and showing reminders, and — the big one — those portal notification emails parsed automatically into the CRM as contacts and opportunities, scored, with the hot ones flagged to an agent immediately.",
   "Every Monday at 8am, before our team huddle, I want a hot list: every lead scored 80+ from the past week, in a spreadsheet and pinged to our agent Telegram group, so the huddle starts with 'who's calling whom today' instead of 'did anyone check the Zillow inbox'."
  ],
  "painPoints": [
   "~250 portal leads/month arrive as emails in a shared inbox; median first contact is 3+ hours and an estimated 15-20 leads/month go completely unworked",
   "No lead qualification: a pre-approved $1.2M buyer gets the same (slow) treatment as an unqualified browser, so senior agent time is spent randomly",
   "Seller valuation requests land on an orphaned landing page with no follow-up sequence — the brokerage's highest-value lead type gets the least attention",
   "Showing no-shows run ~20% because confirmations are whatever each agent remembers to text manually",
   "Zero Monday-morning visibility: the team huddle runs on anecdotes, not a ranked list of this week's hot leads"
  ],
  "whyStack": "GHL natively handles the entire client-facing layer: Buyer and Seller pipelines, custom fields, the valuation and buyer-guide funnels, the showing calendar, speed-to-lead SMS, and appointment reminder workflows. What GHL cannot do is the intake and intelligence layer: it has no way to read a Zillow notification email out of a Gmail inbox and no regex engine to pull the buyer's name, phone, and the property address out of portal HTML — that is n8n's **Gmail Trigger** plus a **Code** node. GHL also has no native lead-scoring model; n8n calls **OpenAI** with the parsed lead payload, gets a strict-JSON score, and writes it back through the GHL API (`services.leadconnectorhq.com`, `Version: 2021-07-28`) into a `Lead Score` field GHL workflows can then act on. Finally, the Monday 8am cross-lead report (aggregate, rank, push to Sheets and Telegram) is a scheduled data job — exactly what n8n's **Schedule Trigger** exists for and what GHL has no reporting primitive to build.",
  "guide": [
   {
    "step": "A1 — Private Integration token and n8n credential",
    "tool": "Setup",
    "detail": "In the Harbor & Pine sub-account go to Settings → **Private Integrations** → **+ Create new integration**, name it `n8n Portal Engine`, and grant scopes for contacts (write), opportunities (write), and tags. Copy the token once — it is only shown once. In n8n open **Credentials → + Add credential → Header Auth**, name it `GHL — Harbor & Pine`, set Name `Authorization` and Value `Bearer YOUR_TOKEN`. Every GHL call will also send header `Version: 2021-07-28` and base URL `https://services.leadconnectorhq.com`. Also note the sub-account's `locationId` from Settings → **Business Profile**."
   },
   {
    "step": "A2 — Custom fields for real-estate qualification",
    "tool": "GHL",
    "detail": "Settings → **Custom Fields** → **+ Add Field**, in a folder named `Real Estate`. Create: `Budget` (dropdown: Under $300k, $300-500k, $500k-800k, $800k-1.2M, $1.2M+), `Area` (dropdown of your five farm neighborhoods), `Pre-approved` (radio: Yes / No / Not sure), `Lead Score` (number), `Score Reason` (single-line text), `Portal Source` (single-line text), `Property Address` (single-line text, for the listing the buyer inquired about). Note each field's ID from the field detail screen — the n8n update calls need the IDs, not the names."
   },
   {
    "step": "A3 — Buyer and Seller pipelines",
    "tool": "GHL",
    "detail": "Settings → **Pipelines** → **+ Create new pipeline**. Pipeline 1 `Buyers`: New Lead → Contacted → Pre-Approved → Touring → Under Contract → Closed. Pipeline 2 `Sellers`: Valuation Requested → CMA Sent → Listing Appt Booked → Listed → Under Contract → Closed. Toggle both pipelines visible in the funnel and pie charts. Open each pipeline once and copy its `pipelineId` and stage IDs from the URL/settings — n8n creates opportunities directly into `New Lead` and `Valuation Requested` by ID."
   },
   {
    "step": "A4 — Tags and the hot-buyers smart list",
    "tool": "GHL",
    "detail": "Settings → **Tags** → **+ New Tag**: `buyer`, `seller`, `portal-zillow`, `portal-realtor`, `hot-lead`, `valuation-request`, `buyer-guide`. Then in **Contacts** click **More Filters**, filter `Lead Score` greater than `79`, tag is `buyer`, and save it as smart list **Hot Buyers** — this is the list agents open after every Monday huddle."
   },
   {
    "step": "B1 — Home-valuation funnel for sellers",
    "tool": "GHL",
    "detail": "Sites → **Funnels** → **+ New Funnel** named `What's Your Home Worth`. Step 1: headline, three trust bullets, and a two-step form built in Sites → **Forms** → **Builder** → **+ Add Form** — step one asks only `Property Address` (custom field) and step two asks Name, Email, Phone, and 'When are you thinking of selling?' (dropdown). Map every input to the custom fields from A2, set the form's **On Submit** to go to Step 2, a thank-you page promising the valuation within 24 business hours. Set **sticky contact** on so returning visitors pre-fill."
   },
   {
    "step": "B2 — Buyer-guide funnel",
    "tool": "GHL",
    "detail": "Second funnel `2026 Neighborhood Buyer Guide`: Step 1 opt-in page with a form capturing Name, Email, Phone plus the qualification trio `Budget`, `Area`, and `Pre-approved` (all mapped to A2 fields — these three answers feed the AI score later). Step 2 delivery page with the guide PDF (upload via the **Media Storage**) and an embedded booking widget for the showing calendar from B3. Form submission adds tag `buyer-guide`."
   },
   {
    "step": "B3 — Round-robin showing calendar",
    "tool": "GHL",
    "detail": "Calendars → **Calendar Settings** → **+ Create Calendar** → **Round Robin**, named `Property Showings & Buyer Consults`. Add all six agents, 30-minute slots, availability 9am-7pm, a 30-minute buffer, minimum scheduling notice 2 hours, and **Optimize for equal distribution**. In **Forms & Payments** attach a short form asking `Property Address` so the agent knows which listing. Copy the permanent link — it goes in the speed-to-lead SMS."
   },
   {
    "step": "C1 — GHL speed-to-lead workflow (both funnels)",
    "tool": "GHL",
    "detail": "Left sidebar → **Automation** → **+ Create Workflow** → **Start from Scratch**, named `Speed to Lead — Web`. Trigger 1 **Form Submitted** filtered to the valuation form; trigger 2 **Form Submitted** filtered to the buyer-guide form. First action **If/Else** on which form: seller branch adds tag `seller`, creates an opportunity in `Sellers` / `Valuation Requested`, sends SMS 'Got your valuation request for {{contact.property_address}} — your report is being prepared, reply with any questions' and an **Internal Notification** to the listing team; buyer branch adds tag `buyer`, creates an opportunity in `Buyers` / `New Lead`, and sends the guide plus the B3 booking link by SMS within the first minute. Both branches end in a **Wait** of 30 minutes → if no reply, a second nudge SMS. **Publish** the workflow — toggle top right."
   },
   {
    "step": "C2 — Showing reminder and no-show workflow",
    "tool": "GHL",
    "detail": "Automation → **+ Create Workflow** `Showing Reminders`, trigger **Customer Booked Appointment** filtered to calendar `Property Showings & Buyer Consults`. Actions: immediate SMS confirmation with date, time, and property; **Wait** until 24 hours before → reminder email; **Wait** until 2 hours before → reminder SMS asking for a `C` to confirm. Add a second branch on trigger **Appointment Status = No-Show**: wait 1 hour, send a friendly re-book SMS with the calendar link, and notify the assigned agent. Publish."
   },
   {
    "step": "C3 — n8n portal intake: Gmail Trigger",
    "tool": "n8n",
    "detail": "In Gmail, create a filter so mail from `@zillow.com` and `@realtor.com` gets label `Portals`. New n8n workflow `Portal Intake Engine`: on the canvas click **+** → **Gmail Trigger**, event **Message Received**, poll every minute, filter **Label Names** = `Portals`, and enable **Simplify** off so you get the full HTML body. Connect a **Switch** node keyed on `{{ $json.from.value[0].address }}` with outputs for `zillow`, `realtor`, and a fallback output for anything unrecognized."
   },
   {
    "step": "C4 — Parse the notification email with a Code node",
    "tool": "n8n",
    "detail": "On each Switch branch add a **Code** node with per-portal regexes against the email body: pull `name` (e.g. `/New lead:?\\s*([A-Z][a-z]+ [A-Z][a-z]+)/`), `phone` (any 10-digit run, normalized to E.164), `email`, `property address`, and the `list price`. Wrap every extraction in a null-safe default and emit one clean JSON item: `{name, firstName, lastName, email, phone, propertyAddress, listPrice, portal}`. Route any item missing BOTH email and phone to the fallback branch — those get a **Gmail** forward to the office manager instead of a silent drop, because portals redesign their emails without warning."
   },
   {
    "step": "C5 — Create the contact and Buyer opportunity via the GHL API",
    "tool": "n8n",
    "detail": "**HTTP Request** node: method POST, URL `https://services.leadconnectorhq.com/contacts/upsert`, authentication **Header Auth** credential `GHL — Harbor & Pine`, header `Version: 2021-07-28`, JSON body with `locationId`, `firstName`, `lastName`, `email`, `phone`, `tags: [\"buyer\", \"portal-zillow\"]`, and `customFields` entries for `Portal Source` and `Property Address` (by field ID from A2). Upsert, not create, so a buyer who inquires on three listings stays one contact. Then a second **HTTP Request**: POST `/opportunities/` with `pipelineId` (Buyers), `pipelineStageId` (New Lead), `contactId` from the upsert response, `name` = property address, and `monetaryValue` = list price. Also append a row to a **Google Sheets** node, sheet `Lead Ledger` — this feeds the Monday report."
   },
   {
    "step": "C6 — OpenAI lead scoring with strict JSON",
    "tool": "n8n",
    "detail": "**OpenAI** node (operation **Message a Model**), system prompt: 'You score real-estate buyer leads 0-100. Inputs: portal, list price, message text, budget, pre-approval if known. Pre-approved + price above $800k + specific property questions = 85+. Reply with ONLY strict JSON: {\"score\": <int>, \"reason\": \"<one sentence>\"}.' Follow with a **Code** node that runs `JSON.parse` inside try/catch, clamps the score to 0-100, and defaults to `{score: 50, reason: \"parse failure — manual review\"}` so a malformed AI reply never breaks intake."
   },
   {
    "step": "C7 — Write the score back and flag hot leads",
    "tool": "n8n",
    "detail": "**HTTP Request**: PUT `https://services.leadconnectorhq.com/contacts/{{ $json.contactId }}` with `customFields` setting `Lead Score` and `Score Reason` by field ID (header `Version: 2021-07-28` as always). Then an **IF** node on `score >= 80`: true branch fires POST `/contacts/{{ $json.contactId }}/tags` with body `{\"tags\": [\"hot-lead\"]}` — that tag is the handoff that wakes GHL up. Update the same contact's row in `Lead Ledger` with the score."
   },
   {
    "step": "C8 — GHL hot-lead pounce workflow",
    "tool": "GHL",
    "detail": "Automation → **+ Create Workflow** `Hot Lead Pounce`, trigger **Contact Tag** with tag `hot-lead` added. Actions: **Internal Notification** (push + email) to the two senior agents with `Lead Score`, `Score Reason`, `Budget`, and `Property Address` merged in; SMS to the lead within the minute ('Saw you asked about {{contact.property_address}} — I can get you in to see it this week. When works?'); move the opportunity to stage `Contacted` once an agent replies via the **Customer Replied** trigger branch. Publish."
   },
   {
    "step": "C9 — Monday 8am hot-list report",
    "tool": "n8n",
    "detail": "Second n8n workflow `Monday Hot List`: **Schedule Trigger**, cron `0 8 * * 1` in the brokerage's timezone (set the workflow timezone in workflow **Settings**, don't trust server UTC). **Google Sheets** node reads `Lead Ledger` filtered to the last 7 days, a **Code** node sorts by score descending and keeps score ≥ 80, then two outputs: **Google Sheets** append to a `Hot List` tab (one row per lead: name, phone, score, reason, property, assigned agent) and a **Telegram** node posting a formatted top-10 to the agents' group chat with each lead's phone number tappable. Optional **Gmail** copy to the broker."
   },
   {
    "step": "C10 — Error Trigger safety net",
    "tool": "n8n",
    "detail": "Third workflow: **Error Trigger** node → **Telegram** message to the ops chat with `{{ $json.workflow.name }}`, the failed node name, and the error message, plus a **Gmail** fallback to the office manager. Open both main workflows' **Settings → Error Workflow** and point them here. A portal email that fails parsing must page a human — in this business a lost lead is a lost commission."
   },
   {
    "step": "C11 — End-to-end test and cutover",
    "tool": "Test",
    "detail": "Forward yourself two saved real Zillow/Realtor notification emails (with the label applied) and watch the execution in n8n **Overview → Executions**: contact created, opportunity in `Buyers/New Lead`, score written, and — for a pre-approved $1.2M test message — the `hot-lead` tag firing the Pounce SMS inside 60 seconds. Submit both funnels as a fake seller and buyer and verify the speed-to-lead SMS and pipeline placement. Book and cancel a showing to test reminders. Finally run `Monday Hot List` manually with **Execute workflow** and confirm the Telegram post matches the sheet. Only then activate the Gmail trigger workflow (toggle **Active**)."
   }
  ],
  "dataModel": [
   "GHL pipelines: `Buyers` (New Lead → Contacted → Pre-Approved → Touring → Under Contract → Closed) and `Sellers` (Valuation Requested → CMA Sent → Listing Appt Booked → Listed → Under Contract → Closed)",
   "GHL custom fields (folder `Real Estate`): `Budget` (dropdown), `Area` (dropdown), `Pre-approved` (radio), `Lead Score` (number), `Score Reason` (text), `Portal Source` (text), `Property Address` (text)",
   "GHL tags: `buyer`, `seller`, `portal-zillow`, `portal-realtor`, `hot-lead`, `valuation-request`, `buyer-guide`; smart list `Hot Buyers` (score > 79)",
   "GHL calendar: `Property Showings & Buyer Consults` — round robin, 6 agents, 30-min slots, 2-hour notice",
   "Google Sheet `Lead Ledger`: Timestamp | Portal | Name | Email | Phone | Property | List Price | Score | Reason | GHL Contact ID — plus a `Hot List` tab written every Monday",
   "n8n credentials: Header Auth `GHL — Harbor & Pine` (Private Integration token), Gmail OAuth2, OpenAI key, Google Sheets OAuth2, Telegram bot"
  ],
  "edgeCases": [
   "Portal email redesigns: regexes WILL eventually miss — the Code node's fallback branch forwards unparseable emails to a human instead of dropping them, and the Error Trigger pages ops on hard failures",
   "Duplicate inquiries: the same buyer inquiring on three listings must upsert into one contact (match on email+phone) with three opportunities, not three contacts",
   "Gmail Trigger replays: if the workflow is deactivated for a day, reactivation can deliver a backlog burst — the upsert endpoint makes re-processing idempotent for contacts, but guard opportunity creation by checking the `Lead Ledger` for the same email+property first",
   "GHL rate limits (burst 100 requests / 10 s): a Saturday-morning portal blast of 30 leads x 4 API calls is close to the ceiling — keep the per-lead call count lean and let n8n's sequential execution pace it",
   "A2P 10DLC: the speed-to-lead and Pounce SMS numbers must have approved registration before launch or carrier filtering silently eats exactly the messages that matter most",
   "Timezones: the Monday `0 8 * * 1` cron and all 'within 60 seconds' claims are brokerage-local — set the n8n workflow timezone explicitly and match GHL's Settings → Business Profile timezone"
  ],
  "acceptance": [
   "A forwarded Zillow notification email becomes a GHL contact + `Buyers/New Lead` opportunity with `Portal Source`, `Property Address`, and `Lead Score` populated, in under 2 minutes, zero manual touches",
   "A test lead engineered to score 80+ receives the Pounce SMS and both senior agents get the internal notification within 60 seconds of the tag landing",
   "Valuation funnel submission creates a `Sellers/Valuation Requested` opportunity and the seller gets the instant SMS; buyer-guide submission delivers the PDF and booking link",
   "A booked showing produces the confirmation, 24-hour, and 2-hour reminders; a no-show gets the re-book SMS after 1 hour",
   "Monday 8am: the `Hot List` tab and the Telegram post agree exactly with the `Lead Ledger` rows scored ≥ 80 from the trailing 7 days",
   "Re-forwarding the same portal email creates zero duplicate contacts and zero duplicate opportunities",
   "Killing the OpenAI credential mid-run still lands the lead in GHL with score 50 / 'manual review', and the Error Trigger posts to Telegram"
  ],
  "portfolio": [
   "Loom (6-8 min): forward a portal email on camera, show the n8n execution parse it, open GHL to the new opportunity with its AI score, show the hot-lead SMS arrive on a real phone, and end on the Monday hot-list Telegram post",
   "Export both n8n workflow JSONs (`Portal Intake Engine`, `Monday Hot List`) plus the Error Trigger workflow and include them in the case-study repo with the regex test strings",
   "Architecture diagram as the hero image: portal email → Gmail Trigger → parse → GHL API → OpenAI score → tag → GHL Pounce workflow, with the funnels and calendar on the GHL side",
   "Frame it honestly: a demonstration build on a fictional brokerage with sample portal emails — the pitch is the measured path from 3-hour median response to under 2 minutes, not invented client revenue"
  ],
  "stretch": [
   "Add an **AI Agent** node that drafts a personalized first SMS referencing the specific property and price band, with the agent approving via Telegram inline buttons before it sends",
   "Pull open-house sign-in sheets (Google Forms) into the same ledger and scoring path so every lead source converges on one hot list",
   "Score decay: a weekly n8n job that subtracts 10 points from any `hot-lead` with no reply in 14 days and removes the tag at 50, keeping the smart list honest"
  ]
 },
 {
  "id": "c27",
  "title": "Won to Wow: B2B Agency Client Machine",
  "industry": "B2B marketing agency",
  "stack": "ghl+n8n",
  "difficulty": "advanced",
  "hours": "12-18 h",
  "brief": [
   "Northbeam Digital is a nine-person B2B marketing agency. We hold 8-10 discovery calls a month, close 2-3 new retainers ($2.5k-$6k MRR each), and currently manage 15 active clients. Our sales side is a Notion board nobody updates and our proposals go out whenever I personally get around to writing them — I've measured it, the average gap between a great discovery call and the proposal landing is 6 days, and we've lost deals purely to that gap.",
   "Onboarding is worse. Every new client needs the same nine things: a Drive folder built from our template structure, a kickoff call on the calendar, a task checklist for the account manager, contract countersigned, first invoice out, and an announcement to the team. Right now that's a 'did anyone...?' Slack thread that takes 3-5 business days and something ALWAYS gets missed — last month a client's kickoff happened before their contract was signed.",
   "And then there's reporting. Fifteen clients each get a monthly performance report. My account managers spend the first three working days of every month copy-pasting numbers into Google Docs — call it 25-30 hours of senior time monthly producing documents that all look slightly different. Clients notice the inconsistency.",
   "I want the whole machine: a real sales pipeline from discovery to close, a case-study page with an audit-request form that feeds it, proposals/contracts/invoices that fire automatically from stage changes, an onboarding sequence that runs itself the moment a deal is marked Won, and a reporting factory that turns a config spreadsheet into 15 branded PDFs on the first of the month."
  ],
  "painPoints": [
   "6-day average gap from discovery call to proposal; at least 2 deals last quarter died in that gap (~$9k MRR lost)",
   "Onboarding is a 3-5 day manual scramble across Drive, Calendar, and Slack — steps get skipped, and once a kickoff ran before the contract was signed",
   "25-30 senior hours every month hand-building 15 monthly report docs, each formatted slightly differently",
   "No pipeline truth: the owner cannot answer 'what's in Proposal right now and how old is it' without asking three people",
   "Invoices are sent manually after signature, adding 1-3 days of unnecessary DSO to every new retainer"
  ],
  "whyStack": "GHL natively carries the whole revenue front-end: the Sales pipeline, the case-study funnel and audit form, the discovery calendar, and the stage-driven proposal → contract → invoice automations using GHL's own Documents & Contracts and Invoices. What it cannot do is operate the delivery side of the business: GHL has no action to build a Google Drive folder tree from a template, create a Google Calendar kickoff event with the right attendees, or mass-produce templated Google Docs and export them to PDF. That is the n8n layer: a **Webhook** catches the stage-change to Won and runs the onboarding machine (Drive + Calendar + GHL API `/contacts/{id}/tasks` for the AM checklist + Telegram announce), and a **Schedule Trigger** on the 1st reads a per-client config sheet and runs the Docs→PDF reporting factory with a **Loop Over Items** — 15 identical, branded PDFs in minutes instead of 30 senior hours.",
  "guide": [
   {
    "step": "A1 — Private Integration token, scopes, and n8n credential",
    "tool": "Setup",
    "detail": "Settings → **Private Integrations** → **+ Create new integration**, name `n8n Ops Machine`, scopes: contacts (write), opportunities (write), tasks (write). Copy the token immediately. In n8n: **Credentials → + Add credential → Header Auth**, name `GHL — Northbeam`, header Name `Authorization`, Value `Bearer YOUR_TOKEN`. All calls use base `https://services.leadconnectorhq.com` and header `Version: 2021-07-28`. Also connect Google Drive, Google Calendar, Google Docs, Google Sheets (one OAuth2 each), and the Telegram bot now, so Phase C is pure wiring."
   },
   {
    "step": "A2 — Client custom fields",
    "tool": "GHL",
    "detail": "Settings → **Custom Fields** → **+ Add Field**, folder `Agency Ops`: `Service Package` (dropdown: SEO Retainer, Paid Media, Full Funnel), `MRR` (monetary), `Kickoff Date` (date), `Account Manager` (dropdown of your three AMs), `Drive Folder URL` (single-line text), `Contract Status` (dropdown: Sent, Signed), `Report Config Row` (number — the client's row in the reporting config sheet). Record every field ID; the n8n write-backs address fields by ID."
   },
   {
    "step": "A3 — Sales pipeline",
    "tool": "GHL",
    "detail": "Settings → **Pipelines** → **+ Create new pipeline** named `Agency Sales`: Discovery Booked → Audit Delivered → Proposal Sent → Negotiation → Won → Lost. Copy the `pipelineId` and each stage ID. Add tags via Settings → **Tags**: `prospect`, `client-active`, `audit-request`, `onboarding` — `client-active` is what separates delivery automations from sales automations everywhere else in the build."
   },
   {
    "step": "B1 — Case-study funnel with audit-request form",
    "tool": "GHL",
    "detail": "Sites → **Funnels** → **+ New Funnel** named `Case Studies`. Step 1: three case-study blocks (framed as demonstration work), each ending in the same CTA button anchored to an embedded form built in Sites → **Forms** → **Builder** → **+ Add Form** named `Free Growth Audit`: Company, Name, Email, Phone, `Website URL`, 'Current monthly marketing spend' (dropdown), 'Biggest bottleneck right now?' (textarea). Map spend and bottleneck to custom fields. Step 2: thank-you page embedding the discovery calendar from B2 so hot prospects book instantly instead of waiting for an email."
   },
   {
    "step": "B2 — Discovery calendar",
    "tool": "GHL",
    "detail": "Calendars → **Calendar Settings** → **+ Create Calendar**, personal booking calendar `Discovery Call — 45 min` on the founder, availability Tue-Thu 10am-4pm, 15-minute buffer, minimum notice 4 hours, Google Meet as the meeting location. In **Notifications** enable booking confirmation email + SMS. This calendar's **Customer Booked Appointment** event is the trigger that opens every deal."
   },
   {
    "step": "B3 — Proposal template, contract, product, and invoice plumbing",
    "tool": "GHL",
    "detail": "Payments → **Products** → **+ Create Product** for each package (e.g. `Full Funnel Retainer`, recurring monthly, $4,500). Then Payments → **Documents & Contracts** → **Templates** → **+ New**: build one proposal/contract template with merge fields ({{contact.company_name}}, `Service Package`, `MRR`), a pricing table linked to the products, and a signature block. Finally Payments → **Invoices** → **Templates**: a first-month invoice template. These are the assets the C-phase automations fire."
   },
   {
    "step": "C1 — Pipeline hygiene workflow: discovery to audit",
    "tool": "GHL",
    "detail": "Left sidebar → **Automation** → **+ Create Workflow** `Sales — Discovery to Audit`. Trigger **Customer Booked Appointment** (calendar `Discovery Call — 45 min`) → **Create Opportunity** in `Agency Sales` / `Discovery Booked` → confirmation email with a 3-question prep form → **Internal Notification** to the founder. Second trigger **Form Submitted** = `Free Growth Audit` adds tag `audit-request` and creates the opportunity at the same stage if none exists. Publish."
   },
   {
    "step": "C2 — Proposal automation on stage change",
    "tool": "GHL",
    "detail": "Automation → **+ Create Workflow** `Sales — Proposal & Contract`. Trigger **Pipeline Stage Changed** → filter pipeline `Agency Sales`, stage is `Proposal Sent`. Actions: **Send Documents & Contracts** using the B3 template (this emails the proposal for signature), set `Contract Status` = Sent, then **Wait** 3 days → **If/Else** on document not signed → polite bump email + task for the founder. Add a parallel branch with trigger **Document Signed**: set `Contract Status` = Signed, **Send Invoice** (first-month template, due on receipt), and internal notification. Publish."
   },
   {
    "step": "C3 — Won trigger: handoff webhook to n8n",
    "tool": "GHL",
    "detail": "Automation → **+ Create Workflow** `Won → Onboarding Handoff`. Trigger **Pipeline Stage Changed**, filter stage is `Won`. Guard first: **If/Else** on `Contract Status` is `Signed` — the false branch stops and pings the founder (this is the 'kickoff before contract' bug, fixed structurally). True branch: add tag `client-active`, then action **Webhook** (POST) to the n8n URL — start with the **Test URL** during the build, swap to the **Production URL** at cutover — sending `contact_id`, `email`, `company_name`, `service_package`, `mrr`, `account_manager`. Publish."
   },
   {
    "step": "C4 — n8n onboarding machine: webhook and normalize",
    "tool": "n8n",
    "detail": "New n8n workflow `Client Onboarding Machine`. Canvas → **+** → **Webhook** node, HTTP Method `POST`, Respond `Immediately`, path `northbeam-won`; copy the test URL into the C3 GHL workflow for now. Then a **Code** node: validate that `contact_id`, `company_name`, and `account_manager` are present (throw a descriptive error if not — the Error Trigger will catch it), trim the company name for use as a folder name, and compute `kickoff_date` = next business day at least 3 days out."
   },
   {
    "step": "C5 — Drive folder tree from the template",
    "tool": "n8n",
    "detail": "**Google Drive** node, operation **Create Folder**, name `{{ $json.company_name }}`, inside the shared `Clients` folder. Then a **Google Drive** node per template asset (or one node after a **Loop Over Items** listing the template folder): operation **Copy**, copying `_Template — SOW`, `_Template — Monthly Report`, `_Template — Meeting Notes`, and the `Assets` subfolder skeleton into the new folder, renaming each copy with the client prefix. Capture the new folder's `webViewLink` — it gets written back to GHL in C8."
   },
   {
    "step": "C6 — Kickoff event on Google Calendar",
    "tool": "n8n",
    "detail": "**Google Calendar** node, operation **Create Event** on the agency's `Delivery` calendar: title `Kickoff — {{ $json.company_name }}`, start `kickoff_date` 10:00 agency-local (set the timezone explicitly on the node, never rely on server UTC), 60 minutes, attendees = client email + the assigned AM's email, Google Meet conferencing on, and the Drive folder link in the description. Turn on **Send Updates → All** so invites actually go out."
   },
   {
    "step": "C7 — AM task checklist via the GHL API",
    "tool": "n8n",
    "detail": "**Code** node emits the nine onboarding tasks as items (`title`, `dueDate` offsets: access collection +1d, tracking audit +3d, kickoff prep +1d before kickoff, 30-day plan +7d, etc.), then **Loop Over Items** → **HTTP Request**: POST `https://services.leadconnectorhq.com/contacts/{{ $('Webhook').item.json.body.contact_id }}/tasks` with credential `GHL — Northbeam`, header `Version: 2021-07-28`, body `{\"title\": ..., \"dueDate\": ..., \"completed\": false}`. Nine tasks land on the contact where the AM already works, not in a separate tool nobody opens."
   },
   {
    "step": "C8 — Write-back and team announce",
    "tool": "n8n",
    "detail": "**HTTP Request**: PUT `/contacts/{contact_id}` setting custom fields `Drive Folder URL` (the webViewLink from C5), `Kickoff Date`, and `Report Config Row`. Then **Google Sheets** append the client to `Reporting Config` (see C9) with status `active`. Finish with a **Telegram** message to the team channel: '🎉 New client: {company} — {package}, ${mrr}/mo. AM: {am}. Kickoff {date}. Folder: {link}' (a **Slack** node is a drop-in swap if the team lives there)."
   },
   {
    "step": "C9 — Reporting config sheet",
    "tool": "Setup",
    "detail": "In Google Sheets click **+ Blank spreadsheet** and name it **Reporting Config**, one row per client: `Client Name` | `Contact Email` | `AM` | `Package` | `Metrics Tab` | `Doc Template ID` | `Drive Folder ID` | `Status`. A second tab `Metrics` holds the per-client numbers the AMs (or later, API pulls) maintain: leads, spend, CPL, wins of the month, next-month focus. This sheet IS the factory's control panel — adding a client to reporting is adding a row, nothing more."
   },
   {
    "step": "C10 — Monthly reporting factory",
    "tool": "n8n",
    "detail": "New workflow `Monthly Report Factory`: **Schedule Trigger** cron `0 7 1 * *` (07:00 on the 1st, workflow timezone set to agency-local). **Google Sheets** reads `Reporting Config` filtered `Status = active` → **Loop Over Items** (batch size 1). Inside the loop: **Google Docs** operation **Create from Template** (template ID from the row) replacing placeholders `{{client_name}}`, `{{month}}`, `{{leads}}`, `{{spend}}`, `{{cpl}}`, `{{wins}}`, `{{focus}}` from the `Metrics` tab; then **Google Drive** operation **Export/Download** as `application/pdf`, saving `{{Client}} — {{Month}} Report.pdf` into the client's `Drive Folder ID`; then **Gmail** node creating a DRAFT (not auto-send) addressed to the client, PDF attached, so the AM adds one personal paragraph and hits send. Append a `Report Log` row per client with a link."
   },
   {
    "step": "C11 — Error Trigger workflow",
    "tool": "n8n",
    "detail": "Workflow `Ops — Error Net`: **Error Trigger** → **Telegram** to the ops channel with workflow name, node, error message, and the client/company involved → **Gmail** copy to the founder. Point both `Client Onboarding Machine` and `Monthly Report Factory` at it via workflow **Settings → Error Workflow**. A half-onboarded client (folder created, no tasks) is worse than a loud failure — this net makes every failure loud."
   },
   {
    "step": "C12 — End-to-end test and cutover",
    "tool": "Test",
    "detail": "Create contact **Testco Industries**, walk it through the pipeline: book a discovery slot (opportunity appears), drag to `Proposal Sent` (document email arrives), sign the test document (invoice fires, `Contract Status` flips), drag to `Won`. Watch n8n **Overview → Executions**: folder tree, calendar invite, nine tasks on the contact, custom fields written, Telegram announce. Then run the factory manually with **Execute workflow** against two config rows and check both PDFs and Gmail drafts. Swap the C3 webhook action from the **Test URL** to the **Production URL**, re-run the Won drag once more end-to-end, then archive Testco."
   }
  ],
  "dataModel": [
   "GHL pipeline `Agency Sales`: Discovery Booked → Audit Delivered → Proposal Sent → Negotiation → Won → Lost",
   "GHL custom fields (folder `Agency Ops`): `Service Package`, `MRR`, `Kickoff Date`, `Account Manager`, `Drive Folder URL`, `Contract Status`, `Report Config Row`",
   "GHL assets: `Free Growth Audit` form, `Discovery Call — 45 min` calendar, Documents & Contracts proposal template, recurring products per package, first-month invoice template; tags `prospect`, `client-active`, `audit-request`, `onboarding`",
   "Google Drive: `Clients/` shared folder + `_Template` folder skeleton (SOW, Monthly Report, Meeting Notes, Assets/)",
   "Google Sheet `Reporting Config`: Client | Email | AM | Package | Metrics Tab | Doc Template ID | Drive Folder ID | Status — plus `Metrics` and `Report Log` tabs",
   "n8n credentials: Header Auth `GHL — Northbeam`, Google Drive/Docs/Calendar/Sheets OAuth2, Gmail OAuth2, Telegram bot"
  ],
  "edgeCases": [
   "Stage flapping: dragging a deal to Won, back, and to Won again would run onboarding twice — before creating the folder, a **Google Drive** search for an existing folder named for the client (or a `Report Config` lookup) short-circuits the run",
   "Won without signature: the C3 If/Else guard on `Contract Status` structurally prevents the kickoff-before-contract failure; test this branch deliberately",
   "Missing metrics on the 1st: if a client's `Metrics` row is blank the factory must SKIP and flag that client in the Telegram summary, never send a PDF full of `{{placeholders}}`",
   "GHL rate limits: nine sequential `/tasks` POSTs per client is fine, but if you batch-onboard several backlogged clients, keep **Loop Over Items** at batch size 1 with a 2-second **Wait** to stay under the burst limit (100 req / 10 s)",
   "Test vs production webhook URL: the n8n `/webhook-test/` URL only listens while the editor is open — the C3 GHL action must be flipped to `/webhook/` before sign-off, and this is the single most common 'it worked yesterday' bug",
   "Timezones: kickoff events and the `0 7 1 * *` cron are agency-local; set explicit timezones on the Calendar node and the workflow, and remember clients in other timezones read the invite in theirs"
  ],
  "acceptance": [
   "Dragging a test deal to `Proposal Sent` emails the merged proposal within 2 minutes, and non-signature after 3 days produces the bump email and founder task",
   "Signing the document flips `Contract Status`, sends the first-month invoice automatically, and only then can Won trigger onboarding",
   "Marking Won produces — with zero manual touches — the Drive folder tree, a kickoff invite received by both attendee inboxes, nine dated tasks on the GHL contact, `Drive Folder URL` populated, and the Telegram announce, all inside 3 minutes",
   "Dragging the same deal to Won twice produces exactly one folder, one event, one task set",
   "Running the factory over a 3-client config sheet yields three correctly merged PDFs in the right client folders and three Gmail drafts, with no unreplaced placeholders",
   "A config row with an invalid `Doc Template ID` fails loudly: Error Trigger posts to Telegram naming the client, and the other clients' reports still complete",
   "The audit-request form creates a `Discovery Booked` opportunity and the case-study funnel's calendar embed books real slots"
  ],
  "portfolio": [
   "Loom (7-9 min): drag a deal to Won on camera and narrate the machine — folder appears in Drive, invite hits the calendar, tasks land on the contact, Telegram lights up; then jump-cut to the reporting factory turning a spreadsheet row into a branded PDF",
   "Export the n8n workflow JSONs (`Client Onboarding Machine`, `Monthly Report Factory`, `Ops — Error Net`) and screenshot the GHL workflow canvases for the repo",
   "Case-study angle: '30 senior hours of monthly reporting collapsed to a spreadsheet row' and '6-day proposal gap to 2 minutes' — measured on the demonstration build, framed honestly as a fictional agency (Northbeam Digital) with template data",
   "Include the Reporting Config sheet as the artifact that shows systems thinking: config-driven automation, not hardcoded per-client workflows"
  ],
  "stretch": [
   "Pull real metrics into the `Metrics` tab automatically: Google Ads and GA4 nodes on a monthly schedule replace AM data entry entirely",
   "Add an **OpenAI** node to the factory that drafts the report's executive-summary paragraph from the month's numbers, inserted as another Docs placeholder for the AM to approve",
   "Client health scoring: a weekly n8n job reading task completion + report opens that flags at-risk accounts to the founder before renewal conversations"
  ]
 },
 {
  "id": "c28",
  "title": "Checkout to Winback: E-commerce Brand Backend",
  "industry": "e-commerce (DTC home goods)",
  "stack": "ghl+n8n",
  "difficulty": "advanced",
  "hours": "10-16 h",
  "brief": [
   "Cedar & Flame sells hand-poured candles and home fragrance — about 900 orders a month across 60 SKUs, average order $42, and Q4 triples that. We're moving our funnel-style offers (bundles, a new-scent launch page, an order-bump sampler) onto GoHighLevel because our old checkout stack couldn't do bumps or one-click upsells, and I want the CRM living where the checkout lives.",
   "My actual operational pain is everything AFTER the checkout. Inventory lives in a spreadsheet my ops manager updates 'when she remembers' — we oversold our best-selling scent twice last quarter and refunding 40 orders cost us more in goodwill than money. I have no idea who my best customers are: no lifetime value, no last-order date, nothing. And we get 100+ product reviews a month across our review platform export that nobody reads systematically — customers have been telling us a wick problem existed for six weeks before we noticed.",
   "The one number I DO know: repeat purchase rate. A customer who doesn't reorder within about 6 weeks usually never does. We do nothing about it. Nine hundred orders a month and zero winback motion is just leaving money on the floor.",
   "So: build me the funnel (sales page, order form with a bump, an upsell), a customer CRM that actually knows LTV and last-order date, a fulfillment pipeline my ops manager works from, and the automation layer — live inventory ledger with low-stock alerts, a weekly AI digest of what reviews are saying, and an automatic 45-day winback that fires without anyone remembering it."
  ],
  "painPoints": [
   "Oversold the best-selling SKU twice last quarter — ~40 refunds and a week of apology emails, because inventory is a manually-updated spreadsheet",
   "No LTV or last-order visibility: the brand cannot distinguish a first-time buyer from a 12-order superfan at any touchpoint",
   "100+ monthly reviews go unread as a body of data; a product defect (wick issue) surfaced 6 weeks late",
   "Zero winback motion despite a known ~6-week reorder window on a 900-order/month base",
   "Fulfillment status lives in the ops manager's head; 'where's my order' emails take 10-15 minutes each to answer"
  ],
  "whyStack": "GHL natively owns the money-facing layer: the sales funnel with order form, order bump, and one-click upsell, the customer CRM with custom fields, the fulfillment pipeline, and the email/SMS workflows (receipt, winback sequence, review request). What GHL cannot be is a ledger or an analyst: it has no inventory table, no way to decrement stock per line item, no scheduled aggregation, and no AI summarization. n8n supplies exactly that — an order **Webhook** feeds a Google Sheets orders ledger and inventory decrement with a **Telegram** low-stock alert, a weekly **Schedule Trigger** + **OpenAI** node mines the reviews sheet into a themed digest, and a daily job finds 45-day-lapsed buyers and pushes them BACK into a GHL workflow by adding a tag via the API (`services.leadconnectorhq.com`, header `Version: 2021-07-28`) — so the sending, unsubscribe handling, and compliance stay where they belong, in GHL.",
  "guide": [
   {
    "step": "A1 — Private Integration token and n8n credentials",
    "tool": "Setup",
    "detail": "Settings → **Private Integrations** → **+ Create new integration**, name `n8n Commerce Backend`, scopes contacts (write) and tags. Copy the token once. In n8n create a **Header Auth** credential `GHL — Cedar & Flame` with Name `Authorization`, Value `Bearer YOUR_TOKEN`; every call adds header `Version: 2021-07-28` on base `https://services.leadconnectorhq.com`. Connect Google Sheets OAuth2, the OpenAI key, and the Telegram bot (create it with @BotFather, add it to the `C&F Ops` group, grab the chat ID) while you're in credentials."
   },
   {
    "step": "A2 — Customer custom fields and tags",
    "tool": "GHL",
    "detail": "Settings → **Custom Fields** → **+ Add Field**, folder `Commerce`: `LTV` (monetary), `Last Order Date` (date), `Order Count` (number), `Favorite Scent` (single-line text), `Winback Sent Date` (date). Note each field ID. Then Settings → **Tags**: `customer`, `first-order`, `repeat-buyer`, `vip` (LTV over $200), `winback-45`, `review-requested`. The n8n layer writes the numbers; GHL segments on them."
   },
   {
    "step": "A3 — Fulfillment pipeline",
    "tool": "GHL",
    "detail": "Settings → **Pipelines** → **+ Create new pipeline** named `Fulfillment`: New Order → Packed → Shipped → Delivered → Issue. This is the ops manager's working board — one card per order, dragged left to right. Copy the `pipelineId` and stage IDs. Add a pipeline for nothing else; customer relationship state lives on the contact (tags + fields), order state lives here."
   },
   {
    "step": "B1 — Sales page and product setup",
    "tool": "GHL",
    "detail": "Payments → **Products** → **+ Create Product** for the funnel offer (e.g. `Autumn Trio Bundle`, $54), the bump (`Wick Trimmer + Sampler`, $12), and the upsell (`Candle-of-the-Month, first month`, $19). Then Sites → **Funnels** → **+ New Funnel** named `Autumn Launch`. Step 1 sales page: hero, scent story, bundle contents, reviews section, CTA button to Step 2. Build mobile-first — this traffic is 80% phones."
   },
   {
    "step": "B2 — Order form with order bump",
    "tool": "GHL",
    "detail": "Funnel Step 2: add an **Order Form** element (two-step style: contact info first, card second — the abandoned-cart trigger needs step one captured). Attach the `Autumn Trio Bundle` product, then in the order form settings enable **Order Bump**, select `Wick Trimmer + Sampler`, and write the one-line bump copy ('Add the tool that doubles your burn time — 40% off with this order'). Connect the Stripe integration under Payments → **Integrations** first if not already live."
   },
   {
    "step": "B3 — One-click upsell and thank-you page",
    "tool": "GHL",
    "detail": "Add funnel Step 3 as an **Upsell** page type: attach `Candle-of-the-Month, first month` with the **1-Click Upsell** element so the stored card from Step 2 is charged without re-entry; Accept → Step 4, Decline link (small, honest) → Step 4. Step 4 thank-you page: order recap, delivery expectations, and 'add us to your contacts' SMS opt-in confirmation."
   },
   {
    "step": "C1 — GHL order workflow: receipt, pipeline card, and handoff webhook",
    "tool": "GHL",
    "detail": "Left sidebar → **Automation** → **+ Create Workflow** `Order Received`. Trigger **Order Form Submission** (filter funnel `Autumn Launch`). Actions: add tags `customer` (+ `first-order` via an **If/Else** on `Order Count` empty), send the branded receipt email, **Create Opportunity** in `Fulfillment` / `New Order` named `#{{order}} — {{contact.name}}` with the order value, **Internal Notification** to ops, and finally action **Webhook** (POST) to the n8n orders URL — **Test URL** during the build — with payload fields: `contact_id`, `email`, `name`, `products` (line items), `total`, `order_id`. Publish."
   },
   {
    "step": "C2 — n8n order intake: webhook, normalize, ledger",
    "tool": "n8n",
    "detail": "New workflow `Order Ledger & Inventory`. Canvas → **+** → **Webhook** node, method `POST`, path `cf-orders`, Respond `Immediately`. Then a **Code** node: explode the `products` array into one item per line (`sku`, `qty`, `unit_price`), coerce `total` to a number, and stamp `order_date` in the store's timezone. **Google Sheets** node appends to spreadsheet `C&F Operations`, tab `Orders`: `Order ID | Date | Email | Contact ID | SKU | Qty | Line Total | Order Total`. Before any side effect, a **Google Sheets** lookup on `Order ID` gates duplicates: if the ID already exists, an **IF** node stops the run cold — GHL webhook retries must not double-decrement stock."
   },
   {
    "step": "C3 — LTV and last-order write-back to GHL",
    "tool": "n8n",
    "detail": "**Google Sheets** node reads all `Orders` rows for this `email`, a **Code** node sums `Order Total` into `ltv` and counts orders, then **HTTP Request**: PUT `https://services.leadconnectorhq.com/contacts/{{ contact_id }}` (credential `GHL — Cedar & Flame`, header `Version: 2021-07-28`) writing custom fields `LTV`, `Last Order Date`, `Order Count` by field ID. Follow with an **IF** on `ltv >= 200` → POST `/contacts/{contact_id}/tags` body `{\"tags\": [\"vip\"]}`, and an **IF** on `orderCount >= 2` adding `repeat-buyer`. Now every GHL email, workflow filter, and smart list can segment on real money."
   },
   {
    "step": "C4 — Inventory decrement and low-stock alert",
    "tool": "n8n",
    "detail": "Continuing per line item: **Google Sheets** lookup on tab `Inventory` (`SKU | Name | On Hand | Reorder At | Supplier`) by `sku`, a **Code** node computes `newOnHand = onHand - qty` (floor at 0 and flag negatives — that means reality already diverged), then **Google Sheets** operation **Update Row** writes `On Hand`. An **IF** node on `newOnHand <= reorderAt` fires a **Telegram** message to `C&F Ops`: '⚠️ LOW STOCK: {Name} ({sku}) at {newOnHand} — reorder point {reorderAt}. Supplier: {supplier}'. Include a second threshold at zero that says OVERSOLD in capitals — that alert is the one that saves the quarter."
   },
   {
    "step": "C5 — GHL fulfillment and review-request workflow",
    "tool": "GHL",
    "detail": "Automation → **+ Create Workflow** `Shipped & Review`. Trigger **Pipeline Stage Changed** → `Fulfillment`, stage is `Shipped`: send the shipping-confirmation email/SMS. **Wait** 10 days (delivery + first burns) → **If/Else** on tag `review-requested` absent → send the review-request email with the review link, add tag `review-requested`. A branch on stage `Issue` notifies ops and opens a task. Publish. Reviews collected land in the platform whose weekly export feeds tab `Reviews` (columns `Date | SKU | Stars | Text`) — manual export or a scheduled fetch, either is fine for the demonstration build."
   },
   {
    "step": "C6 — Weekly OpenAI review-mining digest",
    "tool": "n8n",
    "detail": "New workflow `Review Miner`: **Schedule Trigger** cron `0 7 * * 1` (Monday 7am, workflow timezone set to store-local). **Google Sheets** reads `Reviews` rows from the last 7 days; an **IF** node exits quietly if zero. A **Code** node batches review texts (cap ~50 per run, truncate each to 400 chars) into one prompt payload, then **OpenAI** (operation **Message a Model**): 'You are a CX analyst for a candle brand. From these reviews return ONLY strict JSON: {\"themes\": [{\"theme\": \"...\", \"count\": n, \"sentiment\": \"pos|neg|mixed\", \"example\": \"...\"}], \"defect_flags\": [\"...\"], \"avg_stars\": n}.' A **Code** node `JSON.parse`s in try/catch (on failure, send the raw text with a 'parse failed' banner rather than nothing), then **Telegram** posts the digest to ops and **Gmail** sends a formatted copy to the founder. `defect_flags` non-empty gets a separate 🚨 Telegram line — that is the wick-problem-in-week-one alert."
   },
   {
    "step": "C7 — 45-day lapsed-buyer scan",
    "tool": "n8n",
    "detail": "New workflow `Winback 45`: **Schedule Trigger** daily `0 9 * * *`. **Google Sheets** reads `Orders`, a **Code** node groups by email and keeps customers whose MOST RECENT order date is exactly 44-46 days ago (a 3-day window so a missed run can't orphan anyone), then excludes anyone present in tab `Winback Log` within 90 days — the dedupe ledger. **Loop Over Items** (batch size 10) → **HTTP Request** POST `/contacts/{{ contact_id }}/tags` body `{\"tags\": [\"winback-45\"]}` with a 2-second **Wait** between batches for rate-limit headroom → **Google Sheets** appends each pushed contact to `Winback Log` with the date."
   },
   {
    "step": "C8 — GHL winback workflow (n8n hands the baton back)",
    "tool": "GHL",
    "detail": "Automation → **+ Create Workflow** `Winback — 45 Day`. Trigger **Contact Tag** = `winback-45` added. Actions: Day 0 email 'Your {{contact.favorite_scent}} is probably burned down by now' with a 10% reorder code; **Wait** 3 days → **If/Else** on no purchase → SMS nudge; **Wait** 4 more days → final email with the seasonal bestseller. Add workflow **Goal**: trigger **Order Form Submission** ends the sequence immediately and removes the tag, so nobody gets a discount plea after reordering. GHL owns the sends — unsubscribes, quiet hours, and A2P compliance all apply automatically. Publish."
   },
   {
    "step": "C9 — Error Trigger safety net",
    "tool": "n8n",
    "detail": "Workflow `Commerce — Error Net`: **Error Trigger** → **Telegram** with workflow name, failed node, error message, and the order ID or email in flight → **Gmail** copy to the founder. Set it as the error workflow in **Settings → Error Workflow** for all three C-phase workflows. An order that reached GHL but missed the ledger is invisible shrinkage — every failure must page a human with enough context to replay it."
   },
   {
    "step": "C10 — End-to-end test and cutover",
    "tool": "Test",
    "detail": "In Stripe test mode, buy the funnel on camera-quality data: bundle + bump + accept the upsell. Verify in order: receipt email, `Fulfillment/New Order` card, n8n execution in **Overview → Executions**, three `Orders` rows (bundle, bump, upsell), inventory decremented per SKU, `LTV`/`Last Order Date`/`Order Count` on the contact, and — after a second test purchase — `repeat-buyer`. Re-POST the same webhook payload from n8n's execution view and confirm ZERO new rows (dedupe gate). Backdate a test customer's order 45 days in the sheet, run `Winback 45` manually with **Execute workflow**, and watch the tag fire the GHL sequence. Force a low-stock alert by setting a SKU's `On Hand` to 1. Then swap the C1 webhook action from the **Test URL** to the **Production URL** and repeat one full purchase."
   }
  ],
  "dataModel": [
   "GHL pipeline `Fulfillment`: New Order → Packed → Shipped → Delivered → Issue",
   "GHL custom fields (folder `Commerce`): `LTV` (monetary), `Last Order Date` (date), `Order Count` (number), `Favorite Scent` (text), `Winback Sent Date` (date); tags `customer`, `first-order`, `repeat-buyer`, `vip`, `winback-45`, `review-requested`",
   "GHL products: `Autumn Trio Bundle` ($54), bump `Wick Trimmer + Sampler` ($12), upsell `Candle-of-the-Month` ($19); funnel `Autumn Launch` (sales → order form + bump → 1-click upsell → thank you)",
   "Google Sheet `C&F Operations` — tab `Orders`: Order ID | Date | Email | Contact ID | SKU | Qty | Line Total | Order Total; tab `Inventory`: SKU | Name | On Hand | Reorder At | Supplier; tab `Reviews`: Date | SKU | Stars | Text; tab `Winback Log`: Date | Email | Contact ID",
   "n8n credentials: Header Auth `GHL — Cedar & Flame` (Private Integration token), Google Sheets OAuth2, OpenAI key, Telegram bot"
  ],
  "edgeCases": [
   "Webhook replay/dedupe: GHL retries and double-fires happen — the `Order ID` gate in C2 must run before ANY side effect; prove it by re-POSTing an identical payload and asserting zero new rows and zero stock change",
   "Q4 volume: 90 orders/day x multiple line items approaches Sheets API quotas — batch the ledger append per order (one call, multiple rows) and keep the winback loop at batch size 10 with **Wait** nodes for GHL's burst limit (100 req / 10 s)",
   "Refunds: a refunded order must reverse LTV and re-increment stock — handle GHL's refund event (or a manual `Refunds` tab n8n scans nightly) or the ledger drifts within a month",
   "Test vs production URLs: the `/webhook-test/` URL dies when the n8n editor closes; the C1 workflow must point at `/webhook/` before launch",
   "A2P 10DLC: the winback SMS and shipping texts need approved registration; until then keep those steps email-only or carriers will filter them silently",
   "Timezones and quiet hours: `Last Order Date` math, the Monday digest cron, and winback sends are store-local — set workflow timezones explicitly and keep GHL SMS inside allowed windows"
  ],
  "acceptance": [
   "A test purchase with bump + upsell produces one `Fulfillment` card, three ledger rows, correct per-SKU inventory decrements, and receipt email — all within 2 minutes, zero manual touches",
   "`LTV`, `Last Order Date`, and `Order Count` on the GHL contact match the ledger to the cent after every purchase, and a second order adds `repeat-buyer` (and `vip` past $200)",
   "Replaying the same order webhook changes nothing: no rows, no decrement, no tags",
   "Dropping a SKU to its reorder point triggers the Telegram low-stock alert within one order cycle, and to zero triggers the OVERSOLD alert",
   "Monday 7am digest arrives with themes, counts, sentiment, and any defect flags matching a hand-check of that week's `Reviews` rows",
   "A customer whose last order was 45 days ago gets tagged `winback-45` by the daily scan exactly once (verified in `Winback Log`), the GHL sequence starts, and a purchase mid-sequence stops it via the workflow Goal",
   "Killing the Sheets credential mid-order pages Telegram via the Error Trigger with the order ID included"
  ],
  "portfolio": [
   "Loom (6-8 min): complete a test checkout with bump and upsell on camera, follow the order into the n8n execution, show the ledger row, the inventory cell ticking down, the LTV landing on the GHL contact — then time-jump to the winback tag firing the GHL email",
   "Export the three n8n workflow JSONs (`Order Ledger & Inventory`, `Review Miner`, `Winback 45`) plus the Error Net, and screenshot a sample Monday review digest",
   "Case-study angle: 'the checkout was never the problem — the backend was' with the oversell story and the 45-day window as the hooks; framed honestly as a demonstration build for a fictional brand (Cedar & Flame) with seeded sample data",
   "Include a one-page data-flow diagram: funnel → GHL order webhook → ledger/inventory/LTV → tag → GHL winback, with the two Schedule-Trigger jobs orbiting it"
  ],
  "stretch": [
   "Swap the weekly review export for a real API pull (or an email-attachment **Gmail Trigger** parse) so the `Reviews` tab fills itself",
   "Auto-create a supplier purchase-order draft (Google Docs template) when a low-stock alert fires, pre-filled with SKU, quantity, and supplier from the `Inventory` tab",
   "Tiered winback: a second 90-day pass with a stronger offer for anyone the 45-day sequence didn't recover, and a monthly cohort report comparing recovery rates"
  ]
 },
 {
  "id": "c29",
  "title": "Dispatch Board in Your Pocket: HVAC Operations System",
  "industry": "HVAC / home services",
  "stack": "ghl+n8n",
  "difficulty": "advanced",
  "hours": "12-16 h",
  "brief": [
   "Blue Ridge Heating & Air runs six trucks and does 25-30 jobs a week — install quotes, repairs, and about 420 maintenance-plan members who are supposed to get two tune-ups a year. Dispatch is my wife Dana with a whiteboard and a group text. When an emergency call comes in on a July Saturday, she calls techs one by one until someone picks up; the customer is sweating in a 90-degree house listening to silence.",
   "The paperwork side is worse. A tech finishes a job, texts Dana the details, and she types up an invoice that evening — sometimes two days later, sometimes with the wrong line items. We're carrying about $18k a month in 'finished but not yet invoiced' work at any given time. And our maintenance-plan renewals? A shoebox of index cards, honestly. We lose maybe 8-10 members a quarter purely because nobody reminded them their plan lapsed.",
   "I want a real system: a dispatch pipeline Dana runs from a screen (Booked → Dispatched → Complete → Invoiced), an emergency booking funnel that gets a panicking homeowner onto today's schedule, a maintenance-plan funnel that sells the plan on a recurring product, and reminder and review-request automations so we stop forgetting the small stuff.",
   "The parts I know GHL can't do alone: when a job is booked I want a dispatch card in the techs' Telegram group with the address and an APPROVE link — first tech to tap it owns the job and Dana sees it instantly. When a job hits Complete, the invoice document should generate itself. And the plan renewals need a real ledger with a 30-days-out push, not index cards."
  ],
  "painPoints": [
   "Emergency dispatch is serial phone calls; assignment takes 20-40 minutes while the customer shops competitors",
   "~$18k/month floating as completed-but-uninvoiced work; invoices lag 1-2 days and carry transcription errors",
   "8-10 maintenance members lost per quarter to silent lapses — no renewal ledger, no reminders",
   "No-shows and 'wrong address' truck rolls because confirmations are ad-hoc texts",
   "Review requests happen 'when Dana remembers' — 6 Google reviews in the last year on 1,400 jobs"
  ],
  "whyStack": "GHL natively covers the customer-facing spine: the dispatch pipeline as a visual board, the emergency and maintenance funnels, calendars, the recurring plan product, and the reminder/review workflows. What it cannot do: push an interactive dispatch card with an approve link into a Telegram group and react when a tech taps it (that is an n8n **Webhook** round-trip), generate a formatted invoice document from job data (n8n **Google Docs** template → PDF), or maintain a renewals ledger that wakes up 30 days before each expiry and pushes members back into a GHL sequence via the API (`services.leadconnectorhq.com`, `Version: 2021-07-28`, tag add). GHL is the system of record and the sender; n8n is the dispatcher's runner, the back office, and the calendar-with-a-memory.",
  "guide": [
   {
    "step": "A1 — Private Integration token and n8n credentials",
    "tool": "Setup",
    "detail": "Settings → **Private Integrations** → **+ Create new integration**, name `n8n Dispatch`, scopes contacts (write), opportunities (write), tags. Copy the token once, then in n8n add a **Header Auth** credential `GHL — Blue Ridge` (Name `Authorization`, Value `Bearer YOUR_TOKEN`); all calls hit `https://services.leadconnectorhq.com` with header `Version: 2021-07-28`. Create the Telegram bot with @BotFather, add it to a `BR Techs` group and a separate `BR Office` group, and record both chat IDs. Connect Google Docs, Drive, Sheets, and Gmail OAuth2 credentials now."
   },
   {
    "step": "A2 — Job and plan custom fields",
    "tool": "GHL",
    "detail": "Settings → **Custom Fields** → **+ Add Field**, folder `Field Ops`: `Job Type` (dropdown: Emergency Repair, Repair, Install Quote, Tune-Up), `Job Address` (text), `Gate/Access Notes` (text), `Assigned Tech` (dropdown of the six techs), `Job Value` (monetary), `Invoice URL` (text), `Plan Tier` (dropdown: Silver, Gold), `Plan Renewal Date` (date). Note the field IDs — n8n writes `Assigned Tech`, `Invoice URL`, and `Plan Renewal Date` by ID. Tags via Settings → **Tags**: `emergency`, `plan-member`, `renewal-30`, `review-requested`."
   },
   {
    "step": "A3 — Dispatch pipeline",
    "tool": "GHL",
    "detail": "Settings → **Pipelines** → **+ Create new pipeline** named `Dispatch Board`: Booked → Dispatched → Complete → Invoiced (plus a parking stage `Issue`). One opportunity per job, titled `{{Job Type}} — {{Job Address}}`. Copy the `pipelineId` and every stage ID; n8n moves cards between `Booked → Dispatched` and `Complete → Invoiced` by API, so the IDs are load-bearing. Dana's whole day is this board in the **Opportunities** view."
   },
   {
    "step": "B1 — Emergency booking funnel and same-day calendar",
    "tool": "GHL",
    "detail": "Calendars → **Calendar Settings** → **+ Create Calendar**: `Emergency Service` — simple calendar, 2-hour arrival windows 8am-8pm, minimum notice 1 hour, max 4 bookings/day. Then Sites → **Funnels** → **+ New Funnel** `AC Down? Today.`: Step 1 is a mobile-first page with a tap-to-call button AND a short form (Name, Phone, `Job Address`, 'What's happening?' textarea, mapped to fields) leading to Step 2, the embedded `Emergency Service` calendar. Every submission gets tag `emergency` via the form settings."
   },
   {
    "step": "B2 — Maintenance-plan funnel with recurring product",
    "tool": "GHL",
    "detail": "Payments → **Products** → **+ Create Product**: `Comfort Club — Silver` ($16/mo recurring) and `Comfort Club — Gold` ($27/mo recurring, priority dispatch + no trip fees). Then a second funnel `Comfort Club`: Step 1 sells the plan (two-column tier comparison, plain-language benefits), Step 2 is an **Order Form** attached to the products with the two-step layout, Step 3 thank-you page setting expectations ('we'll call within 2 business days to book your first tune-up'). Checkout adds tag `plan-member`."
   },
   {
    "step": "B3 — Routine booking calendar",
    "tool": "GHL",
    "detail": "Calendars → **Calendar Settings** → **+ Create Calendar** again for a third calendar `Service & Tune-Ups`: round robin across techs is tempting, but techs aren't interchangeable on installs — use a **Simple Calendar** with 2-hour windows and let dispatch assign. In **Forms & Payments** attach a booking form asking `Job Type`, `Job Address`, and `Gate/Access Notes`. Both calendars feed the same C1 workflow, so every booked job — routine or emergency — enters the same dispatch machine."
   },
   {
    "step": "C1 — GHL job-created workflow: card, confirmation, handoff",
    "tool": "GHL",
    "detail": "Left sidebar → **Automation** → **+ Create Workflow** `Job Booked`. Trigger **Customer Booked Appointment** on either calendar (add both as triggers). Actions: **Create Opportunity** in `Dispatch Board` / `Booked` with `Job Value` estimate by `Job Type`; confirmation SMS with the arrival window; **If/Else** on tag `emergency` — true branch also sends an **Internal Notification** to Dana marked URGENT. Final action: **Webhook** (POST) to n8n — **Test URL** while building — with `contact_id`, `opportunity_id`, `name`, `phone`, `job_type`, `job_address`, `access_notes`, `appointment_time`, `emergency` (boolean). Publish."
   },
   {
    "step": "C2 — n8n dispatch card to the techs' Telegram",
    "tool": "n8n",
    "detail": "New workflow `Dispatch Card`. **Webhook** node, method `POST`, path `br-job-created`, Respond `Immediately` → **Code** node builds the card text: '🔧 {JOB TYPE}{ 🚨 EMERGENCY if flagged}\\n📍 {address}\\n🕐 {window}\\n📝 {notes}' and constructs an approve link: the workflow's SECOND webhook URL (see C3) with query params `?opp={opportunity_id}&job={job_type}` plus a per-tech `&tech=` value. **Telegram** node, operation **Send Message**, chat `BR Techs`, with **Reply Markup → Inline Keyboard** — one button per tech ('Marcus ✋', 'Deshawn ✋', ...) each pointing at the approve URL with its own `tech` param. First tap wins."
   },
   {
    "step": "C3 — Approve-link webhook: first tap owns the job",
    "tool": "n8n",
    "detail": "In the same workflow add a second **Webhook** node, method `GET`, path `br-job-approve`, Respond **When Last Node Finishes** (so the tech's phone shows a result page). Chain: **Google Sheets** lookup on tab `Dispatch Log` by `opp` — if already assigned, respond 'Too slow — {tech} has it' and stop (that's the race-condition gate). Otherwise: **Google Sheets** append `{opp, tech, timestamp}`; **HTTP Request** PUT `https://services.leadconnectorhq.com/opportunities/{{ $json.query.opp }}` moving the card to stage `Dispatched`; a second **HTTP Request** PUT on the contact writing `Assigned Tech` by field ID; **Telegram** edit/post to `BR Techs`: '✅ {tech} took the {job_type} on {address}'; and a **Respond to Webhook** node returning a plain 'You got it, {tech}. Details in your calendar.' page."
   },
   {
    "step": "C4 — GHL reminder and en-route workflow",
    "tool": "GHL",
    "detail": "Automation → **+ Create Workflow** `Job Reminders`: trigger **Appointment** time-based branches — 24 hours before, confirmation SMS asking to reply `C`; 1 hour before, 'Your technician {{contact.assigned_tech}} is scheduled for your window' SMS. Add a trigger **Pipeline Stage Changed** to `Dispatched` that texts the customer the assigned tech's first name and photo link — the small touch that kills 'who is this stranger at my door' calls. Publish."
   },
   {
    "step": "C5 — Invoice generation when a job hits Complete",
    "tool": "GHL",
    "detail": "Automation → **+ Create Workflow** `Complete → Invoice Handoff`: trigger **Pipeline Stage Changed** → `Dispatch Board`, stage is `Complete`. Single action: **Webhook** POST to the n8n invoice URL with `contact_id`, `opportunity_id`, `name`, `email`, `job_address`, `job_type`, `job_value`, `assigned_tech`. Keep GHL's role thin here on purpose — the document work belongs to n8n. Publish. (Techs move the card to `Complete` from the GHL mobile app in the truck; that swipe IS the invoice request.)"
   },
   {
    "step": "C6 — n8n invoice factory",
    "tool": "n8n",
    "detail": "New workflow `Invoice Factory`. **Webhook** (POST, path `br-invoice`, Respond `Immediately`) → **Google Sheets** lookup in `Rate Card` tab mapping `job_type` to default line items → **Google Docs** operation **Create from Template** using the branded invoice template, replacing `{{invoice_no}}` (date-sequence from a counter cell), `{{customer}}`, `{{address}}`, `{{line_items}}`, `{{total}}`, `{{tech}}` → **Google Drive** export as `application/pdf` into folder `Invoices/{{year-month}}` → **Gmail** sends it to the customer with a payment link → **HTTP Request** PUT the opportunity to stage `Invoiced` and PUT the contact's `Invoice URL` field (header `Version: 2021-07-28`). Append everything to a `Invoice Log` sheet tab. The $18k float dies here: Complete-to-invoice becomes ~90 seconds."
   },
   {
    "step": "C7 — Renewal ledger intake on plan purchase",
    "tool": "n8n",
    "detail": "Extend a small workflow `Plan Ledger`: trigger via a GHL workflow (**Order Form Submission** on the `Comfort Club` funnel → **Webhook** action) posting `contact_id`, `email`, `name`, `plan_tier`, `purchase_date`. n8n **Code** node computes `renewal_date = purchase_date + 12 months` and the two tune-up target months, then **Google Sheets** appends to tab `Plan Ledger`: `Contact ID | Name | Tier | Start | Renewal | Tune-Up 1 Done | Tune-Up 2 Done | Status`, and **HTTP Request** PUTs `Plan Renewal Date` onto the contact. The shoebox of index cards is now a queryable table."
   },
   {
    "step": "C8 — Daily 30-days-out renewal scan",
    "tool": "n8n",
    "detail": "Workflow `Renewal Radar`: **Schedule Trigger** daily `0 8 * * *` (workflow timezone set to shop-local). **Google Sheets** reads `Plan Ledger` where `Status = active`; a **Code** node keeps rows whose `Renewal` date is 29-31 days out (3-day window survives missed runs) and not already flagged. **Loop Over Items** (batch size 10, 2-second **Wait** between batches for the burst limit) → **HTTP Request** POST `/contacts/{{ contact_id }}/tags` body `{\"tags\": [\"renewal-30\"]}` → **Google Sheets** marks the row flagged. Same pattern flags members missing a tune-up at the 5-month mark — the plan's promise, kept mechanically."
   },
   {
    "step": "C9 — GHL renewal and review workflows",
    "tool": "GHL",
    "detail": "Automation → **+ Create Workflow** `Renewal — 30 Day`: trigger **Contact Tag** = `renewal-30` → email ('Your Comfort Club renews on {{contact.plan_renewal_date}} — here's what your membership handled this year') → **Wait** 7 days → SMS with a one-tap renew link → **Wait** 14 days → task for Dana to call. Workflow **Goal**: renewal payment ends the sequence. Second workflow `Review Request`: trigger **Pipeline Stage Changed** to `Invoiced` → **Wait** 1 day → **If/Else** tag `review-requested` absent → SMS with the Google review link mentioning the tech by name ('How did {{contact.assigned_tech}} do?') → add tag. Publish both."
   },
   {
    "step": "C10 — Error Trigger safety net",
    "tool": "n8n",
    "detail": "Workflow `BR — Error Net`: **Error Trigger** → **Telegram** to `BR Office` with workflow name, node, error, and the job address in flight → **Gmail** to the owner. Point `Dispatch Card`, `Invoice Factory`, `Plan Ledger`, and `Renewal Radar` at it in **Settings → Error Workflow**. A dispatch card that silently fails on a July emergency is the exact failure this business cannot absorb — the net makes it a 30-second Telegram fix instead."
   },
   {
    "step": "C11 — Full-chain test and cutover",
    "tool": "Test",
    "detail": "Book a fake emergency through the funnel: verify the `Booked` card, Dana's URGENT notification, and the Telegram dispatch card with six buttons. Tap approve as 'Marcus' from one phone, then tap as 'Deshawn' from another — assert Deshawn gets 'Too slow', the card sits in `Dispatched`, and `Assigned Tech` reads Marcus. Drag to `Complete` from the GHL mobile app and time the invoice PDF + email + `Invoiced` move (target under 2 minutes). Buy a test Comfort Club plan, backdate its `Renewal` to 30 days out, run `Renewal Radar` with **Execute workflow**, and confirm the tag fires the GHL sequence. Then flip BOTH GHL webhook actions (C1, C5) from **Test URL** to **Production URL** and re-run one job end-to-end — `webhook-test` URLs die when the editor closes, and this system runs Saturdays."
   }
  ],
  "dataModel": [
   "GHL pipeline `Dispatch Board`: Booked → Dispatched → Complete → Invoiced (+ `Issue`)",
   "GHL custom fields (folder `Field Ops`): `Job Type`, `Job Address`, `Gate/Access Notes`, `Assigned Tech`, `Job Value`, `Invoice URL`, `Plan Tier`, `Plan Renewal Date`; tags `emergency`, `plan-member`, `renewal-30`, `review-requested`",
   "GHL calendars: `Emergency Service` (2-hour windows, 1-hour notice, cap 4/day) and `Service & Tune-Ups`; recurring products `Comfort Club — Silver` ($16/mo) and `Gold` ($27/mo)",
   "Google Sheet `BR Operations` — tab `Dispatch Log`: Opp ID | Tech | Timestamp; tab `Rate Card`: Job Type | Line Items | Default Total; tab `Invoice Log`: Invoice No | Date | Customer | Total | PDF Link; tab `Plan Ledger`: Contact ID | Name | Tier | Start | Renewal | Tune-Up 1 | Tune-Up 2 | Status",
   "Google Docs: branded invoice template with `{{invoice_no}}`, `{{customer}}`, `{{line_items}}`, `{{total}}` placeholders; Drive folder `Invoices/YYYY-MM`",
   "n8n credentials: Header Auth `GHL — Blue Ridge`, Telegram bot (two group chat IDs), Google Docs/Drive/Sheets OAuth2, Gmail OAuth2"
  ],
  "edgeCases": [
   "Approve-link race: two techs tapping within a second must resolve to exactly one owner — the `Dispatch Log` lookup-before-write in C3 is the gate; test it with two phones deliberately",
   "Webhook replay: a GHL retry on the job-created webhook would post a duplicate dispatch card — gate on `opportunity_id` in `Dispatch Log` before sending to Telegram",
   "No tech taps within 15 minutes: add a **Wait** + check branch that re-posts the card with '@here STILL OPEN' and pings Dana — an unclaimed emergency can't just age silently",
   "Test vs production URLs: both GHL webhook actions must point at `/webhook/` (production) before launch; the editor-only `/webhook-test/` URL is the classic Saturday-morning outage",
   "A2P 10DLC: confirmation, en-route, review, and renewal SMS all need approved registration — sequence the campaign approval before go-live or fall back to email",
   "Timezones and quiet hours: arrival windows, the 8am renewal cron, and reminder sends are shop-local; set n8n workflow timezones explicitly and keep GHL SMS inside compliant hours"
  ],
  "acceptance": [
   "An emergency funnel booking produces the `Booked` card, customer confirmation SMS, and the Telegram dispatch card with per-tech buttons in under 60 seconds",
   "First tap assigns the job (card → `Dispatched`, `Assigned Tech` written, group notified); second tap gets 'Too slow' and changes nothing",
   "Moving a card to `Complete` yields a correct branded PDF invoice emailed to the customer and the card in `Invoiced` within 2 minutes, with `Invoice URL` on the contact",
   "A Comfort Club purchase writes a `Plan Ledger` row with renewal date +12 months and `Plan Renewal Date` on the contact",
   "The daily scan tags members 30 days from renewal exactly once, the GHL sequence fires, and a completed renewal payment ends it via the Goal",
   "An invoiced job triggers the review SMS naming the right tech after 1 day, once per customer",
   "Breaking the Docs template mid-test pages `BR Office` via the Error Trigger with the job address included, and no card is left stranded in `Complete`"
  ],
  "portfolio": [
   "Loom (7-9 min): book an emergency on camera, show the Telegram card hit a real phone, tap approve, show the pipeline card jump to `Dispatched`, complete the job from the mobile app, and end on the invoice PDF landing in an inbox — the full chain in one take",
   "Export the n8n workflow JSONs (`Dispatch Card` with its two webhooks, `Invoice Factory`, `Plan Ledger`, `Renewal Radar`, `BR — Error Net`) and include the invoice template",
   "Frame honestly as a demonstration build for a fictional contractor (Blue Ridge Heating & Air) — the pitch numbers are the measured demo timings: 20-40 minutes of dispatch phone tag to first-tap-wins in seconds, and Complete-to-invoice in ~90 seconds",
   "Hero image: the dual-webhook dispatch diagram (job → card → approve race → pipeline move) — interviewers who run service businesses recognize this problem on sight"
  ],
  "stretch": [
   "Replace the approve URL with Telegram **callback buttons** and a Telegram Trigger node so approval happens inside Telegram with no browser hop, editing the original card message in place",
   "Add photo capture: tech uploads before/after photos to a GHL form on `Complete`, and the invoice factory embeds them in a job-summary page linked from the invoice",
   "Route-aware assignment: feed `Job Address` through a distance-matrix **HTTP Request** and order the tech buttons by proximity to their last job of the day"
  ]
 },
 {
  "id": "c30",
  "title": "The 12,000-Contact Rescue: Migration + Hygiene Capstone",
  "industry": "home improvement (windows & doors)",
  "stack": "ghl+n8n",
  "difficulty": "advanced",
  "hours": "14-20 h",
  "brief": [
   "Lakeshore Windows & Doors has been in business 14 years and it shows — in the worst way. Our 'CRM' is a legacy system we stopped paying attention to around 2021: the export is a 12,400-row CSV where phone numbers appear in four different formats, maybe a third of the emails bounce, 'source' is a free-text field with 87 unique spellings of about six actual sources, and I'd guess 15-20% of the rows are the same human entered twice or three times by different salespeople.",
   "We have NO automations. None. A lead fills the website form, it emails our sales inbox, and whether anything happens next depends on who's having a good week. We track deals in a spreadsheet named `PIPELINE_2024_FINAL_v7_USE_THIS_ONE.xlsx`. I am not proud of any of this, which is why I'm hiring someone to do it right rather than dragging the mess into a new tool as-is.",
   "What I want is a clean start that doesn't lose 14 years of history: design the GHL account properly FIRST — fields, tags, pipelines that match how we actually sell (quote appointment → measure → install) — then migrate the 12,400 rows through a real validation pipeline, not a blind import: normalize, dedupe, quarantine the garbage where I can review it, and give me a report of exactly what came in, what merged, and what got rejected and why. Then rebuild our lead funnel and the basic automation suite (speed-to-lead, appointment reminders, a reactivation campaign for the clean historic contacts).",
   "And because I've watched data rot once already: I want a nightly job that patrols the new system — duplicates creeping back in, junk phone numbers, contacts missing a source — and sends a scorecard so the rot never gets a foothold again."
  ],
  "painPoints": [
   "12,400-row legacy export with ~15-20% duplicate humans, four phone formats, 87 free-text spellings of ~6 lead sources, and a bounce-heavy email column",
   "Zero automations: website leads land in a shared inbox and first contact depends entirely on individual salespeople noticing",
   "Deal tracking in `PIPELINE_2024_FINAL_v7_USE_THIS_ONE.xlsx` — no stage history, no owner, no forecast",
   "14 years of past customers (windows have a 15-25 year replacement and referral cycle) completely unmined",
   "Every previous 'CRM cleanup' decayed within months because nothing patrolled data quality afterward"
  ],
  "whyStack": "GHL natively provides everything the clean target system needs: the field/tag/pipeline architecture, the rebuilt lead funnel and calendar, and the core automation suite (speed-to-lead, reminders, reactivation). What GHL absolutely cannot do is the migration itself: its native CSV import is a blind bulk insert — no per-row validation, no cross-row dedupe against fuzzy matches, no normalization of 87 source spellings, no quarantine trail, and no rate-managed API writes. That is an n8n data pipeline: **Extract from File** parses the CSV, **Code** nodes validate/normalize, an n8n **Data Table** plus dedupe logic collapses duplicate humans, **Loop Over Items** + **Wait** batch the GHL API writes (`services.leadconnectorhq.com`, `Version: 2021-07-28`) under the rate limit, rejects land in a reviewable quarantine sheet, and a written migration report closes the project. The nightly hygiene patrol — scan, score, Telegram scorecard — is likewise a scheduled job GHL has no primitive for. This is the portfolio piece that proves you can be trusted with someone's 14 years of data.",
  "guide": [
   {
    "step": "A1 — Audit the legacy export and write the mapping doc",
    "tool": "Setup",
    "detail": "Before touching GHL, pull the CSV into Google Sheets via **File → Import → Upload** and profile it: row count, column list, % blank per column, distinct values of the source field (all 87, via **Data → Create a filter** or a `UNIQUE()` column), phone format samples, and an eyeball pass for duplicate humans. Produce a one-page mapping table: `legacy column → GHL field | transform rule | reject rule` (e.g. `PHONE1 → phone | strip non-digits, E.164, assume +1 | reject if <10 digits`; `SOURCE → Lead Source | dictionary map 87→6 | default 'Unknown-Legacy'`). This document is a portfolio artifact in its own right — it is the difference between a migration and an import."
   },
   {
    "step": "A2 — Design the clean field and tag architecture",
    "tool": "GHL",
    "detail": "Settings → **Custom Fields** → **+ Add Field**, folder `Lakeshore`: `Lead Source` (dropdown: Website, Referral, Home Show, Door Hanger, Google, Unknown-Legacy), `Project Type` (dropdown: Windows, Doors, Both), `Property Age` (number), `Legacy ID` (text — the old system's row key, your audit trail), `Last Job Date` (date), `Data Quality` (dropdown: verified, imported, quarantine-recovered). Tags via Settings → **Tags**: `legacy-import`, `past-customer`, `open-lead-2024plus`, `do-not-contact`, `reactivation-eligible`. Naming convention rule, written down: fields hold values you filter/merge on, tags hold membership — no `tag-as-field` sludge in the new build."
   },
   {
    "step": "A3 — Pipelines that match how Lakeshore actually sells",
    "tool": "GHL",
    "detail": "Settings → **Pipelines** → **+ Create new pipeline** `Sales`: New Lead → Contacted → Quote Appt Booked → Quoted → Measure Scheduled → Install Booked → Completed → Lost. Copy `pipelineId` and stage IDs. Historic OPEN deals from the spreadsheet will be recreated into the correct stage during migration (C6); historic CLOSED business becomes contact history (`Last Job Date` + `past-customer` tag), NOT thousands of dead opportunities clogging the board."
   },
   {
    "step": "A4 — Private Integration token and n8n credentials",
    "tool": "Setup",
    "detail": "Settings → **Private Integrations** → **+ Create new integration**, name `n8n Migration`, scopes contacts (write), opportunities (write), tags. Copy the token once; in n8n create **Header Auth** credential `GHL — Lakeshore` (Name `Authorization`, Value `Bearer YOUR_TOKEN`), all requests on `https://services.leadconnectorhq.com` with header `Version: 2021-07-28`. Also fetch `GET /locations/{locationId}/customFields` once in an **HTTP Request** node and save the field-ID map into your mapping doc — every write in Phase C addresses custom fields by ID."
   },
   {
    "step": "B1 — Rebuild the lead funnel",
    "tool": "GHL",
    "detail": "Sites → **Funnels** → **+ New Funnel** `Free Window Quote`: Step 1 mobile-first quote page (trust strip: 14 years, financing, lifetime glass warranty) with a form built in Sites → **Forms** → **Builder** → **+ Add Form**: Name, Phone, Email, `Project Type`, `Property Age`, and 'How soon?' (dropdown mapped to a field). Step 2 thank-you page embedding the B2 calendar so a hot lead books the quote appointment immediately instead of waiting for a callback. Form sets `Lead Source` = Website."
   },
   {
    "step": "B2 — Quote-appointment calendar",
    "tool": "GHL",
    "detail": "Calendars → **Calendar Settings** → **+ Create Calendar** `In-Home Quote — 60 min`, round robin across the two estimators, 60-minute slots with 30-minute drive buffer, availability Mon-Sat 9am-6pm, minimum notice 12 hours. Booking questions: `Job Address`, best gate/parking notes. This calendar's **Customer Booked Appointment** trigger anchors the reminder workflow in C1."
   },
   {
    "step": "C1 — Core automation suite in GHL",
    "tool": "GHL",
    "detail": "Three workflows via left sidebar → **Automation** → **+ Create Workflow**. (1) `Speed to Lead`: trigger **Form Submitted** → SMS inside the first minute with the calendar link → **Create Opportunity** in `Sales`/`New Lead` → **Internal Notification**; **Wait** 30 min → no-reply nudge. (2) `Quote Appt Reminders`: trigger **Customer Booked Appointment** → move opportunity to `Quote Appt Booked` → confirmation, 24-hour email, 2-hour SMS; no-show branch re-books. (3) `Legacy Reactivation`: trigger **Contact Tag** = `reactivation-eligible` → gentle 3-touch sequence over 10 days ('It's been a while — windows from the 2010s are due for a check') with workflow **Goal** on reply or booking. Publish all three; the third one waits for the migration to feed it."
   },
   {
    "step": "C2 — n8n migration workflow: ingest the CSV",
    "tool": "n8n",
    "detail": "New workflow `Lakeshore Migration`. Start with a **Manual Trigger** (a migration must never fire itself). **Google Drive** node downloads `lakeshore_export.csv` → **Extract from File** node (operation **CSV**, header row on, keep everything as strings — leading zeros in zips die otherwise). Immediately after, a **Code** node stamps each row with `row_number` and the raw original as `_raw`, so every downstream reject can point at its exact source line."
   },
   {
    "step": "C3 — Validate and normalize every row",
    "tool": "n8n",
    "detail": "A **Code** node implements the A1 mapping doc: trim and title-case names; lowercase emails and validate with a real regex; strip phones to digits, prepend `+1`, reject under 10 digits; map the 87 source spellings through a dictionary object to the 6 dropdown values (default `Unknown-Legacy`); parse `Last Job Date` from its three legacy date formats; and classify each row `valid`, `fixable` (auto-fixed, note appended), or `reject` (no usable email AND no usable phone, or name blank). Emit `status` and `reject_reason` on every item — nothing is silently dropped, ever."
   },
   {
    "step": "C4 — Dedupe with a data table",
    "tool": "n8n",
    "detail": "Duplicates hide behind different keys, so dedupe in two passes in a **Code** node: pass 1 groups on normalized email, pass 2 groups the remainder on normalized phone + fuzzy last-name match. Within each group, merge to the SURVIVOR: most recent `Last Job Date` wins as base, non-empty fields fill from the others, all `Legacy ID`s concatenate into the survivor's `Legacy ID` field, and losers are emitted with `status = merged_into:<survivor>`. Persist survivor keys into an n8n **Data Table** `migration_seen` (columns `email`, `phone`, `ghl_contact_id`) — this makes the whole migration RE-RUNNABLE: a second execution upserts instead of duplicating, which you will be grateful for the first time a batch dies at row 7,000."
   },
   {
    "step": "C5 — Batched, rate-limited writes to the GHL API",
    "tool": "n8n",
    "detail": "**Loop Over Items** node, batch size 50. Inside the loop: **HTTP Request** POST `https://services.leadconnectorhq.com/contacts/upsert` (credential `GHL — Lakeshore`, header `Version: 2021-07-28`), body with `locationId`, name, email, phone, `tags: [\"legacy-import\"]` plus `past-customer` where `Last Job Date` exists, and `customFields` by ID (`Lead Source`, `Legacy ID`, `Last Job Date`, `Data Quality` = imported). Set the node's **Retry on Fail** (2 retries, 5 s) and **On Error → Continue (using error output)**, routing failures to the quarantine path with the API's error body attached. After each batch, a **Wait** node of 6 seconds — 50 requests per ~6 s keeps comfortable headroom under the burst limit (100 requests / 10 s) for a total run of roughly 25-30 minutes for 10k survivors. Write each success (`Legacy ID → ghl_contact_id`) back to the `migration_seen` data table."
   },
   {
    "step": "C6 — Recreate open deals from the pipeline spreadsheet",
    "tool": "n8n",
    "detail": "A second branch (or a small sibling workflow): **Google Drive** + **Extract from File** on `PIPELINE_2024_FINAL_v7_USE_THIS_ONE.xlsx`, a **Code** node maps its status column onto the new `Sales` stage IDs and joins each row to its migrated contact via the `migration_seen` data table, then **Loop Over Items** → **HTTP Request** POST `/opportunities/` with `pipelineId`, `pipelineStageId`, `contactId`, `name`, and `monetaryValue`. Only OPEN deals cross over — rows marked won/lost become contact history, per the A3 decision. Tag these contacts `open-lead-2024plus`."
   },
   {
    "step": "C7 — Quarantine sheet for every reject",
    "tool": "n8n",
    "detail": "All items with `status` = `reject` (from C3), merge-losers (C4, for the audit trail), and API failures (C5 error output) flow into one **Google Sheets** node appending to spreadsheet `Lakeshore Migration`, tab `Quarantine`: `Row # | Raw Name | Raw Email | Raw Phone | Reject Reason | Merged Into | API Error | _raw`. The owner reviews this tab, fixes what's fixable, marks rows `retry`, and a tiny **Manual Trigger** side-workflow re-feeds `retry` rows through the same C3→C5 chain with `Data Quality` = quarantine-recovered. Nothing from 14 years of business gets deleted by a script — humans retire data, pipelines just sort it."
   },
   {
    "step": "C8 — Migration report email",
    "tool": "n8n",
    "detail": "Final chain after the loop completes: a **Code** node aggregates the run — rows read, valid, auto-fixed, duplicate groups merged (with the before/after contact count), contacts created vs updated, opportunities created, quarantined by reason — and a **Gmail** node sends the report as an HTML table to the owner and you, with the Quarantine tab linked. Also append a summary row to tab `Migration Runs` (timestamp, counts, duration). In an interview, THIS email is the artifact you show: it proves the migration was measured, reversible, and honest about its rejects."
   },
   {
    "step": "C9 — Nightly hygiene patrol",
    "tool": "n8n",
    "detail": "New workflow `Hygiene Patrol`: **Schedule Trigger** cron `0 2 * * *` (2am shop-local; set the workflow timezone). **HTTP Request** GET `/contacts/?locationId=...&limit=100` paginated via the response's `startAfter`/`startAfterId` cursor in a loop (a **Code** node manages the cursor; ~125 pages for 12k contacts, with a 1-second **Wait** per page for rate headroom). Then a **Code** node scans the full set: duplicate emails/phones that crept back in, phones failing E.164, contacts missing `Lead Source`, contacts with zero tags. Compute a 0-100 hygiene score (weighted: dupes worst), append the nightly numbers to tab `Hygiene History`, and **Telegram** the scorecard to the owner: '🧹 Hygiene 96/100 · 2 new dupes (linked) · 3 bad phones · 1 missing source' with a Sheets link to the offender list. An **IF** node escalates any score under 90 with an @mention — rot gets caught in days, not years."
   },
   {
    "step": "C10 — Error Trigger and reactivation release",
    "tool": "n8n",
    "detail": "Workflow `Migration — Error Net`: **Error Trigger** → **Telegram** with workflow, node, error, and the batch's first `Legacy ID` → **Gmail** copy; set it as the error workflow on the migration, deals, and patrol workflows via **Settings → Error Workflow**. Then the payoff step: a one-time **Manual Trigger** workflow that reads clean migrated `past-customer` contacts with a valid phone, `Last Job Date` older than 3 years, and no `do-not-contact` tag, and adds `reactivation-eligible` via POST `/contacts/{id}/tags` in **Loop Over Items** batches of 25 with **Wait** nodes — releasing them in controlled waves of a few hundred per day into the C1 GHL reactivation sequence, so replies stay answerable and sending reputation stays intact."
   },
   {
    "step": "C11 — Dry run, sample run, full run",
    "tool": "Test",
    "detail": "Three-gate test protocol, in writing. Gate 1: run C2→C4 with the API node DISABLED (pin its input) over all 12,400 rows and review the counts — validation and dedupe logic get right before any write. Gate 2: a 200-row stratified sample (clean rows, known dupes, known garbage) through the FULL chain into GHL; hand-verify 20 contacts field-by-field against the CSV, verify the dupes merged, verify the quarantine reasons read sensibly; re-run the same 200 and assert zero new contacts (the data-table upsert gate holds). Gate 3: full run, watch **Overview → Executions**, receive the report email, spot-check 30 random contacts. Then trigger the hygiene patrol manually once, and finally release the first reactivation wave. Keep the Gate 2 screenshots — they are your interview evidence."
   }
  ],
  "dataModel": [
   "GHL pipeline `Sales`: New Lead → Contacted → Quote Appt Booked → Quoted → Measure Scheduled → Install Booked → Completed → Lost",
   "GHL custom fields (folder `Lakeshore`): `Lead Source` (6-value dropdown), `Project Type`, `Property Age`, `Legacy ID` (audit key), `Last Job Date`, `Data Quality` (verified / imported / quarantine-recovered); tags `legacy-import`, `past-customer`, `open-lead-2024plus`, `do-not-contact`, `reactivation-eligible`",
   "Mapping doc (A1): legacy column → GHL field | transform rule | reject rule — including the 87→6 source dictionary",
   "n8n Data Table `migration_seen`: email | phone | legacy_id | ghl_contact_id — the idempotency ledger that makes re-runs safe",
   "Google Sheet `Lakeshore Migration` — tabs: `Quarantine` (Row # | Raw fields | Reject Reason | Merged Into | API Error | _raw), `Migration Runs` (per-run counts), `Hygiene History` (nightly score + breakdown)",
   "n8n credentials: Header Auth `GHL — Lakeshore` (Private Integration token), Google Drive/Sheets OAuth2, Gmail OAuth2, Telegram bot"
  ],
  "edgeCases": [
   "Rate limits at scale: 10k+ upserts must be paced — **Loop Over Items** batch 50 + **Wait** 6 s stays under the 100-req/10-s burst; never fire the whole file at once, and let **Retry on Fail** absorb transient 429s",
   "Mid-run death: a network blip at row 7,000 must not mean starting over OR duplicating 7,000 contacts — the `migration_seen` data table plus `/contacts/upsert` makes the whole pipeline idempotent and resumable",
   "Merge conflicts: two rows, same email, DIFFERENT names (shared family address, remarriage, data entry error) — auto-merge only on high-confidence matches; conflicting-name groups go to Quarantine for a human call",
   "Legacy dates: three formats plus Excel serial numbers in the same column — parse defensively and route unparseable dates to `fixable` with the raw value preserved, never guess a year",
   "Reactivation compliance: 14-year-old phone numbers get released in small waves, only with `Last Job Date` proof of relationship, honoring `do-not-contact`, with A2P registration approved BEFORE the first SMS — one spam complaint wave can poison the new number on day one",
   "Timezones: the 2am patrol cron and all date math run shop-local; set the n8n workflow timezone explicitly so 'yesterday' means the same thing in the scorecard and the sheet"
  ],
  "acceptance": [
   "Migration report shows every one of the 12,400 rows accounted for: created + updated + merged + quarantined = total, with zero silent drops",
   "Dedupe collapses the seeded duplicate humans (test set includes 20 known dupes across email and phone keys) into single contacts holding concatenated `Legacy ID`s",
   "Re-running the full migration creates zero new contacts — the data-table + upsert idempotency gate holds under deliberate replay",
   "20 randomly sampled migrated contacts match the CSV field-for-field after transforms (E.164 phones, mapped sources, parsed dates)",
   "Open deals from the spreadsheet appear in the correct `Sales` stages, joined to the right migrated contacts",
   "The rebuilt funnel fires speed-to-lead SMS within 60 seconds and books real quote appointments with working reminders",
   "The nightly patrol catches a deliberately planted duplicate and bad phone in its next scorecard, and the Telegram summary matches the `Hygiene History` row"
  ],
  "portfolio": [
   "Loom (8-10 min), the interview showpiece: open the horrifying raw CSV, walk the mapping doc, run the migration on camera, show the report email land with its counts, open a merged contact showing three legacy IDs, then show the nightly scorecard — the arc is chaos → measured order",
   "Export the n8n workflow JSONs (`Lakeshore Migration`, deals importer, `Hygiene Patrol`, `Migration — Error Net`) plus the mapping doc and a redacted sample of the Quarantine tab",
   "Frame honestly: a demonstration build on a synthesized 12,400-row dataset engineered to contain every real-world defect (dupes, formats, free-text sources) — the honesty IS the credibility, since anyone can claim a clean import",
   "Write-up angle: 'a migration is a data pipeline with a rollback story, not a CSV upload' — lead with the accounting identity (created + merged + quarantined = total) and the idempotent re-run"
  ],
  "stretch": [
   "Add an **OpenAI** pass over Quarantine rows that suggests fixes (name casing, transposed digits, source guesses) into a `Suggested Fix` column for one-click human approval",
   "Email verification: run migrated emails through a verification API in n8n before the reactivation wave, tagging `email-verified` / `email-risky` and suppressing the risky tier",
   "Turn the hygiene patrol into a weekly PDF trend report (Docs template → PDF) showing the hygiene score over time — proof to the owner that the rot stayed dead"
  ]
 }
];

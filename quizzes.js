// GHL 30-Day Intensive - per-day self-test data (5 questions per day)
// Format: {day: [{q, options[4], correct(index), explain}]}
window.GHL30_QUIZZES = {
 "1": [
  {
   "q": "In GoHighLevel's account structure, what is the relationship between the Agency account and Sub-Accounts?",
   "options": [
    "The Agency account is one client business; Sub-Accounts are its departments",
    "They are two separate logins with no connection to each other",
    "The Agency account is the parent control tower (billing, snapshots, white-label); each Sub-Account holds one client business",
    "Sub-Accounts are read-only copies of the Agency account used for backups"
   ],
   "correct": 2,
   "explain": "The Agency account is the parent level for billing, sub-account creation, snapshots, and white-label, while each client business lives in its own Sub-Account (also called a Location)."
  },
  {
   "q": "Where does an automation specialist spend roughly 90% of their working time in GHL?",
   "options": [
    "Inside sub-accounts, where client contacts, funnels, and workflows live",
    "In Agency View, managing billing and plans",
    "In the App Marketplace installing add-ons",
    "In GHL University watching training modules"
   ],
   "correct": 0,
   "explain": "Day-to-day client work (contacts, funnels, workflows) happens inside sub-accounts, so specialists spend about 90% of their time there rather than in Agency View."
  },
  {
   "q": "What is an Account Snapshot in GHL?",
   "options": [
    "A screenshot of the dashboard saved for reporting",
    "A daily automatic backup of contact data only",
    "A log of every change made in a sub-account",
    "A saved template of a whole sub-account (funnels, workflows, pipelines) that can be reused"
   ],
   "correct": 3,
   "explain": "A snapshot packages an entire sub-account's setup — funnels, workflows, pipelines — into a reusable template you can apply when creating new sub-accounts."
  },
  {
   "q": "What is the correct path to create a new sub-account?",
   "options": [
    "Sub-account view, then Settings, then Business Profile, then New Account",
    "Agency View, then Sub-Accounts, then + Create Sub-Account",
    "Agency View, then Dashboard, then Add Location",
    "Sub-account view, then Launchpad, then Create Account"
   ],
   "correct": 1,
   "explain": "Sub-accounts are created from Agency View by opening the Sub-Accounts list and clicking + Create Sub-Account in the top-right."
  },
  {
   "q": "Which set of sidebar items would you expect to see inside a sub-account (not in Agency View)?",
   "options": [
    "Reselling, Add-ons, Template Library, University",
    "Account Snapshots, Sub-Accounts, Company Settings",
    "Conversations, Contacts, Opportunities, Automation, Sites",
    "App Marketplace, Ideas, Team, Reselling"
   ],
   "correct": 2,
   "explain": "The sub-account sidebar contains the client-level tools like Conversations, Contacts, Opportunities, Automation, and Sites, while items like Snapshots and Reselling belong to Agency View."
  }
 ],
 "2": [
  {
   "q": "A dental client wants to track which patients are interested in Invisalign for a future campaign. Should you use a tag or a custom field, and why?",
   "options": [
    "A custom field, because interest is an attribute of the person",
    "A tag, because it is a stackable yes/no label used for segmenting and triggering campaigns",
    "A Smart List, because lists store interest data",
    "A note on the contact record, because interest changes over time"
   ],
   "correct": 1,
   "explain": "Interest in a service is a segmentation bucket, not a single-valued attribute, so a stackable tag is the right tool for campaign targeting."
  },
  {
   "q": "What is a Smart List in GHL Contacts?",
   "options": [
    "A one-time static export of selected contacts",
    "An AI-generated list of your most engaged contacts",
    "A list of contacts sorted alphabetically by last activity",
    "A saved, live-updating filter that appears as a tab across the top of Contacts"
   ],
   "correct": 3,
   "explain": "A Smart List is a saved filter that updates automatically as contacts match or stop matching its conditions, and each one shows as its own tab in Contacts."
  },
  {
   "q": "During a CSV import, what is the most important thing to verify on the field mapping screen?",
   "options": [
    "That every CSV column maps to the correct destination field and nothing is left on \"Don't import\" unintentionally",
    "That the file is under 1 MB in size",
    "That the CSV uses semicolons instead of commas",
    "That all contacts have a profile photo column"
   ],
   "correct": 0,
   "explain": "Bad mapping silently loses or misplaces client data, so verifying every column's destination field (including custom fields) is the crucial step of any import."
  },
  {
   "q": "In a contact import CSV, how do you correctly put multiple tags on one contact?",
   "options": [
    "Add a separate Tags column for each tag",
    "Separate tags with semicolons in the Email column",
    "Put the tags in one cell separated by commas, wrapped in quotes",
    "Multiple tags cannot be imported; they must be added manually"
   ],
   "correct": 2,
   "explain": "Multiple tags go into a single Tags cell separated by commas and wrapped in quotes, such as \"patient-lapsed,vip\"."
  },
  {
   "q": "What does the DND (Do Not Disturb) setting on a contact record do?",
   "options": [
    "It hides the contact from Smart Lists",
    "It blocks outbound communication to the contact, either for all channels or per channel (Email, SMS, Calls)",
    "It archives the contact after 30 days of inactivity",
    "It prevents team members from editing the contact's fields"
   ],
   "correct": 1,
   "explain": "DND is the compliance kill-switch: it can be toggled for all channels or per channel, and automations must respect it so the contact is not messaged."
  }
 ],
 "3": [
  {
   "q": "What is the difference between a contact and an opportunity in GHL?",
   "options": [
    "A contact is a person; an opportunity is a potential deal attached to that person, sitting at one stage of a pipeline with a dollar value",
    "They are the same record shown in two different views",
    "An opportunity is a person; a contact is the company they work for",
    "A contact is a lead and an opportunity is only a customer who already paid"
   ],
   "correct": 0,
   "explain": "Contacts answer \"who do we know\" while opportunities are deals in motion — one contact can have several opportunities, each with its own stage and value."
  },
  {
   "q": "Why should you NOT add \"Won\" and \"Lost\" as pipeline stages?",
   "options": [
    "Because pipelines are limited to five stages maximum",
    "Because Won and Lost stages slow down the kanban board",
    "Because stage names cannot contain past-tense words",
    "Because GHL already tracks Won and Lost as opportunity statuses, and duplicate stages double-count revenue in reports"
   ],
   "correct": 3,
   "explain": "Won and Lost are opportunity statuses, not stages, so adding them as columns double-counts revenue in reporting — a classic cleanup item in inherited accounts."
  },
  {
   "q": "Which set of stage names follows the professional stage-naming rule?",
   "options": [
    "Call them, Send quote, Chase payment",
    "New Inquiry, Contacted, Consult Booked, Treatment Accepted",
    "Step 1, Step 2, Step 3, Step 4",
    "Hot, Warm, Cold, Frozen"
   ],
   "correct": 1,
   "explain": "Each stage should be a state a deal sits in (noun or past-tense, like \"Consult Booked\"), reading left-to-right as the customer journey — never action commands like \"Call them\"."
  },
  {
   "q": "What are the four opportunity statuses in GHL?",
   "options": [
    "New, Active, Stale, Closed",
    "Pending, Approved, Rejected, Expired",
    "Open, Won, Lost, Abandoned",
    "Lead, Prospect, Customer, Churned"
   ],
   "correct": 2,
   "explain": "Every opportunity carries one of four statuses — Open (still in play), Won (closed, revenue counted), Lost (they said no), and Abandoned (vanished or disqualified)."
  },
  {
   "q": "Using the standard formula, how is win rate calculated?",
   "options": [
    "Won divided by total contacts in the account",
    "Won divided by the sum of Won plus Lost",
    "Won plus Abandoned divided by all opportunities",
    "Total pipeline value divided by Won value"
   ],
   "correct": 1,
   "explain": "Win rate = Won divided by (Won + Lost); whether Abandoned deals count is a separate reporting decision because they are excluded from that math differently."
  }
 ],
 "4": [
  {
   "q": "In the Conversations reply box, what does the Internal Note tab do?",
   "options": [
    "It sends a message flagged as high priority to the contact",
    "It schedules the message to send later",
    "It saves a highlighted note visible only to teammates — it is never sent to the contact",
    "It translates the message before sending"
   ],
   "correct": 2,
   "explain": "Internal notes render highlighted in the thread for teammates only and never go to the contact — confusing them with a live SMS is a classic rookie mistake."
  },
  {
   "q": "Why should a production account set up a dedicated sending domain instead of sending from the shared LC Email subdomain?",
   "options": [
    "The shared subdomain has a hard limit of 10 emails per day",
    "Dedicated domains make emails load faster",
    "The shared subdomain cannot send HTML emails",
    "On the shared subdomain your sender reputation is pooled with strangers, hurting deliverability"
   ],
   "correct": 3,
   "explain": "A dedicated sending domain (like mail.yourdomain.com, verified with DNS records) isolates your sender reputation instead of pooling it with every other account on the shared LC subdomain."
  },
  {
   "q": "Which statement correctly matches the email authentication DNS records to their jobs?",
   "options": [
    "SPF lists servers allowed to send for the domain; DKIM is a cryptographic signature proving the message wasn't forged; DMARC is the policy for what receivers do when the others fail",
    "SPF encrypts the message body; DKIM lists allowed servers; DMARC signs the message",
    "SPF is the reply-to address; DKIM is the unsubscribe link; DMARC is the spam filter",
    "All three are interchangeable names for the same verification record"
   ],
   "correct": 0,
   "explain": "SPF authorizes sending servers, DKIM cryptographically signs messages against forgery, and DMARC tells receiving servers what to do (and where to report) when SPF/DKIM checks fail."
  },
  {
   "q": "A US client complains that their SMS messages are silently failing or barely delivering. What should you check first?",
   "options": [
    "Whether the messages are over 100 characters",
    "Whether the account has completed A2P 10DLC brand and campaign registration",
    "Whether the contact list is sorted alphabetically",
    "Whether the client is using email templates instead of SMS templates"
   ],
   "correct": 1,
   "explain": "US carriers filter unregistered application-to-person SMS on 10-digit long codes, so unregistered A2P 10DLC status is the expected first thing to check when business SMS won't deliver."
  },
  {
   "q": "Which merge field syntax correctly inserts the contact's first name into a message?",
   "options": [
    "[contact.first_name]",
    "%first_name%",
    "{{contact.first_name}}",
    "{contact:first name}"
   ],
   "correct": 2,
   "explain": "GHL merge fields use two curly braces around object dot field with no spaces, so {{contact.first_name}} resolves to the contact's first name at send time."
  }
 ],
 "5": [
  {
   "q": "On a booking calendar, what is the difference between meeting duration, slot interval, and buffer?",
   "options": [
    "Duration is the timezone, interval is the workweek, buffer is the lunch break",
    "Duration is how far ahead people can book, interval is the reminder timing, buffer is the cancellation window",
    "All three control the same setting in different menus",
    "Duration is how long the meeting is, interval is how often new slots start, buffer is the protected gap after each appointment"
   ],
   "correct": 3,
   "explain": "Duration sets the meeting length, slot interval sets how frequently bookable start times appear, and buffer reserves protected time after each appointment."
  },
  {
   "q": "In Google Calendar sync, what is the difference between the conflict calendar and the linked (add-to) calendar?",
   "options": [
    "The conflict calendar is checked to hide slots where you're busy; the linked calendar is where GHL writes new bookings",
    "The conflict calendar stores cancellations; the linked calendar stores reschedules",
    "The conflict calendar is for the agency; the linked calendar is for the sub-account",
    "They are the same setting with two names in different GHL versions"
   ],
   "correct": 0,
   "explain": "The conflict calendar is the Google-to-GHL direction (busy times hide booking slots), while the linked calendar is the GHL-to-Google direction (new bookings get written to it)."
  },
  {
   "q": "A client asks why their booking page shows open slots at times when they are busy in Google Calendar. What is the most likely fix?",
   "options": [
    "Increase the buffer time to 60 minutes",
    "Delete and recreate the booking calendar",
    "Tick their Google calendar under \"Check for conflicts\" in Settings, My Profile, Calendar Settings",
    "Turn off the booker confirmation email"
   ],
   "correct": 2,
   "explain": "Slots showing during busy times means the conflict calendar isn't ticked — that setting lives on the user's profile calendar settings, not on the booking calendar itself."
  },
  {
   "q": "What is a Calendar Group in GHL?",
   "options": [
    "A team of users who share one calendar's availability",
    "A folder for archiving old, unused calendars",
    "A recurring block of unavailable time across all calendars",
    "A bundle of several calendars on one booking page so the visitor picks a service"
   ],
   "correct": 3,
   "explain": "A group combines multiple calendars (event types) onto a single shareable page, letting the visitor choose which service to book."
  },
  {
   "q": "Which appointment statuses matter because they can trigger automations (like no-show rebooking messages)?",
   "options": [
    "Draft, Published, Archived",
    "Confirmed, Showed, No-Show, Cancelled",
    "Open, Won, Lost, Abandoned",
    "Pending, Paid, Refunded"
   ],
   "correct": 1,
   "explain": "Appointments carry statuses like Confirmed, Showed, No-Show, and Cancelled, and workflows can trigger on those values — for example No-Show sending a rebooking SMS."
  }
 ],
 "6": [
  {
   "q": "Why is it important that form fields are mapped to contact fields (standard or custom)?",
   "options": [
    "Mapped fields load faster on mobile devices",
    "Mapping is required before a form can be styled",
    "Unmapped fields cause the form submission to fail",
    "Mapped fields write submitted values straight into the contact record automatically; unmapped fields only live in the submission"
   ],
   "correct": 3,
   "explain": "Mapping is what makes a submission update the contact record automatically — a generic unmapped element stores its answer only in the submission, where automations can't use it."
  },
  {
   "q": "In the form builder, what is the difference between dragging a generic Dropdown element versus dragging your Insurance Provider field from the Custom Fields group?",
   "options": [
    "The custom-field version writes its answer to the contact record and comes pre-populated with the field's options; the generic one only stores the answer in the submission",
    "The generic dropdown supports more than five options; the custom field does not",
    "They behave identically once the form is saved",
    "The generic dropdown is free; custom fields require a paid plan"
   ],
   "correct": 0,
   "explain": "Dragging the custom field from the Custom Fields group gives you a mapped element whose options live on the field and whose answers write to the contact record, unlike a generic element."
  },
  {
   "q": "What does the Sticky Contact option on a form do, and what is its main risk?",
   "options": [
    "It prevents the contact from unsubscribing; the risk is compliance complaints",
    "It pins the form to the top of the page; the risk is layout issues on mobile",
    "It pre-fills the form with previously-entered info for returning visitors; the risk is leaking the previous person's details on shared computers",
    "It locks the contact record after submission; the risk is staff being unable to edit it"
   ],
   "correct": 2,
   "explain": "Sticky Contact stores prior entries in the visitor's browser to pre-fill forms — convenient for multi-form funnels, but on shared or public computers it can expose the previous user's data."
  },
  {
   "q": "After a form is submitted, in which three places can you verify the submission and its data?",
   "options": [
    "Agency Dashboard, Snapshots, and the Template Library",
    "Sites, Forms, Submissions; the contact's record showing mapped field values; and the contact's activity stream",
    "Reporting, Reputation, and Memberships",
    "Only in the email notification sent to the admin"
   ],
   "correct": 1,
   "explain": "A submission shows up in the form's Submissions view, on the contact record (where mapped values populate the actual fields), and as a form-submission event in the contact's activity stream."
  },
  {
   "q": "What does conditional logic in a survey allow you to do?",
   "options": [
    "Automatically translate questions based on the visitor's language",
    "Limit the survey to one submission per IP address",
    "Randomize the order of the questions for each respondent",
    "Route respondents to different slides based on their answer, such as jumping unhappy respondents straight to an improvement question"
   ],
   "correct": 3,
   "explain": "Conditional logic uses an answer to decide which slide comes next — for example, \"Poor\" jumps straight to \"What should we improve?\" — the same skeleton behind review-gating and qualification quizzes."
  }
 ],
 "7": [
  {
   "q": "What safeguard does GHL use when you delete a sub-account?",
   "options": [
    "It emails all team members a 7-day cancellation link",
    "It keeps a 30-day recycle bin where the sub-account can be restored",
    "It requires you to type the sub-account's name to confirm, and deletion is permanent with no undo",
    "It only archives the sub-account; data is never actually removed"
   ],
   "correct": 2,
   "explain": "Deletion is permanent and removes everything (contacts, pipelines, calendars, forms), so GHL makes you type the sub-account name to confirm — there is no undo."
  },
  {
   "q": "During a hand-off audit of a pipeline, which finding should be flagged as a problem to fix?",
   "options": [
    "\"Won\" and \"Lost\" exist as stage columns on the board",
    "Every opportunity has a dollar value assigned",
    "Stage names read as states in customer-journey order",
    "The board contains at least one Won and one Lost example"
   ],
   "correct": 0,
   "explain": "Won and Lost belong as opportunity statuses, not stage columns — stage columns named Won/Lost double-count revenue and are a standard cleanup item in an audit."
  },
  {
   "q": "Why should you always test booking pages and forms in an incognito/private window?",
   "options": [
    "Incognito windows load pages faster than normal windows",
    "You see the page as a real visitor would, avoiding logged-in behavior like cached widgets and pre-filled data",
    "GHL blocks form submissions from logged-in browsers",
    "Incognito mode is required for the submission to count in reports"
   ],
   "correct": 1,
   "explain": "Logged-in GHL sessions can behave differently from what a real visitor sees, so incognito testing prevents the \"works for me, broken for the client's customers\" bug class."
  },
  {
   "q": "What are the four headings of the reusable one-page case study format?",
   "options": [
    "Summary, Timeline, Budget, Results",
    "Intro, Features, Screenshots, Conclusion",
    "Goal, Process, Outcome, Lessons",
    "Client, Problem, What I built, Tools used"
   ],
   "correct": 3,
   "explain": "The case study uses exactly four headings — Client, Problem, What I built, and Tools used — a consistent format recycled for every portfolio piece."
  },
  {
   "q": "What is the purpose of the timed 90-minute rebuild in a throwaway \"Test Clinic\" sub-account?",
   "options": [
    "To stress-test GHL's servers with duplicate data",
    "To create a permanent backup copy of Summit Dental",
    "To prove you can rebuild the CRM foundation from memory at job-ready pace, simulating the timed build tests agencies give applicants",
    "To practice deleting contacts in bulk"
   ],
   "correct": 2,
   "explain": "The self-test simulates the 1-2 hour build tests agencies give candidates: rebuilding a sub-account, pipeline, custom fields, calendar, and mapped form from memory under a clock."
  }
 ],
 "8": [
  {
   "q": "In the GHL page editor, what is the correct four-layer layout hierarchy, from biggest to smallest?",
   "options": [
    "Page > Block > Widget > Field",
    "Row > Section > Element > Column",
    "Section > Row > Column > Element",
    "Container > Grid > Cell > Component"
   ],
   "correct": 2,
   "explain": "Sections are full-width bands that hold rows, rows split into 1-6 columns, and columns hold the elements like headlines, images, and buttons."
  },
  {
   "q": "What is the key difference between a funnel and a website in GoHighLevel?",
   "options": [
    "A funnel is a short linear page sequence with one goal, while a website is a browsable hub with navigation and many paths",
    "Funnels are built in a different editor than websites",
    "Websites can accept payments but funnels cannot",
    "Funnels require a custom domain while websites use the free preview URL"
   ],
   "correct": 0,
   "explain": "Both are built with the same page editor under Sites, but funnels move visitors step by step toward one conversion goal while websites inform through many navigable pages."
  },
  {
   "q": "What is the difference between padding and margin when styling an element?",
   "options": [
    "Padding only applies to sections and margin only applies to elements",
    "Padding is space inside an element's edges; margin is space outside that pushes neighbors away",
    "Margin is space inside an element's edges; padding pushes neighboring elements away",
    "They are two names for the same spacing control"
   ],
   "correct": 1,
   "explain": "Padding adds space inside an element's own edges, while margin adds space outside it, pushing neighboring elements away."
  },
  {
   "q": "You place white headline text over a background photo and it is hard to read. What is the professional fix taught for this?",
   "options": [
    "Move the headline into its own separate section below the image",
    "Make the headline font much larger",
    "Switch the background back to a solid color",
    "Add a dark overlay at roughly 50% opacity over the background image"
   ],
   "correct": 3,
   "explain": "A dark overlay of around 50% opacity keeps text readable over a photo; text on an un-darkened image is a classic amateur tell."
  },
  {
   "q": "Where do tracking snippets go if they need to apply to every step of a funnel, such as a client's Facebook Pixel?",
   "options": [
    "In each element's Advanced settings",
    "In the funnel-level Settings head/body tracking boxes, which apply to all steps",
    "In each page's SEO Meta Data description field",
    "In the Business Profile under Settings"
   ],
   "correct": 1,
   "explain": "Funnel-level settings, including the head/body tracking code boxes, apply to every step, while page-level tracking boxes apply to just one page."
  }
 ],
 "9": [
  {
   "q": "What is the correct professional order for building a lead-generation funnel?",
   "options": [
    "Plan the offer and create the lead magnet first, then build the form and pages",
    "Build the pages first, then decide what to offer visitors",
    "Buy a domain first, since the funnel cannot work without one",
    "Set up email automation first, then build the opt-in page"
   ],
   "correct": 0,
   "explain": "The rookie mistake is opening the page editor with no offer; pros plan the value exchange and create the lead magnet before touching pages."
  },
  {
   "q": "How do you make a form submission send the visitor to the thank-you page?",
   "options": [
    "Add a workflow that emails the visitor a link to the thank-you page",
    "Set the thank-you page as the funnel's first step",
    "GHL automatically sends form submitters to the next funnel step with no configuration",
    "In the form's Options, set On Submit to redirect to the thank-you step's URL (or set it on the form element in the page editor)"
   ],
   "correct": 3,
   "explain": "The On Submit setting, found in the form builder's Options tab or on the form element depending on version, controls where visitors go after submitting."
  },
  {
   "q": "Which trigger and action combination automatically tags every lead who submits the opt-in form?",
   "options": [
    "Contact Created trigger with a Send Email action",
    "Tag Added trigger with a Form Submitted action",
    "Form Submitted trigger (filtered to that form) followed by an Add Contact Tag action",
    "Appointment Booked trigger followed by an Add Contact Tag action"
   ],
   "correct": 2,
   "explain": "A two-node workflow with a Form Submitted trigger filtered to the specific form, plus an Add Contact Tag action, tags every opt-in automatically once published."
  },
  {
   "q": "What are the two core jobs of a thank-you page in a lead-gen funnel?",
   "options": [
    "Collect the visitor's payment details and upsell a membership",
    "Confirm the win and tell the lead exactly what happens next",
    "Display the privacy policy and unsubscribe options",
    "Redirect visitors back to the opt-in page for a second submission"
   ],
   "correct": 1,
   "explain": "A pro thank-you page confirms the opt-in worked, delivers the promised item, and tells the lead what happens next, often teasing the next offer."
  },
  {
   "q": "Your test form submission never appears in Contacts. Which of these is a likely cause?",
   "options": [
    "You submitted the form inside the editor instead of on the real preview URL",
    "The contact record needs to be created manually before a form can attach to it",
    "You used an incognito window, which blocks form submissions",
    "The funnel has more than two steps"
   ],
   "correct": 0,
   "explain": "The usual culprits are testing inside the editor, previewing an unsaved page version, or a form element with no form selected; always test in an incognito window on the real preview link."
  }
 ],
 "10": [
  {
   "q": "What is the standard 3-step structure of a booking funnel?",
   "options": [
    "Opt-in page, sales page, order form",
    "Landing page that sells the session, a calendar page, and a confirmation page",
    "Calendar page, payment page, thank-you page",
    "Home page, about page, contact page"
   ],
   "correct": 1,
   "explain": "Step 1 sells the free session, step 2 is nothing but the embedded calendar, and step 3 confirms the booking and prepares the person to show up."
  },
  {
   "q": "Why must the calendar be created before building the booking funnel?",
   "options": [
    "GHL locks the funnel builder until at least one calendar exists",
    "Calendars take 24 hours to activate after creation",
    "The funnel's middle step embeds the calendar, so it has to exist first",
    "The funnel automatically copies its page design from the calendar"
   ],
   "correct": 2,
   "explain": "The Book step uses a Calendar element that pulls in an existing calendar from a dropdown, so the calendar must exist before the funnel can embed it."
  },
  {
   "q": "Where do you configure what happens after someone completes a booking, such as redirecting to your Confirmed page?",
   "options": [
    "In the funnel's Settings tab",
    "In the button action of the Book step",
    "In the Contacts area under smart lists",
    "In the calendar's settings, under the Confirmation (or Forms and Payment) section, by choosing redirect to a custom URL"
   ],
   "correct": 3,
   "explain": "The post-booking behavior lives in the calendar's own settings, not the funnel; you switch it from the default thank-you message to a redirect and paste the Confirmed step's URL."
  },
  {
   "q": "What is the purpose of adding a 15-minute buffer after each appointment on the calendar?",
   "options": [
    "It stops back-to-back sessions from colliding with other duties by adding space between appointments",
    "It gives visitors 15 extra minutes to fill out the booking form",
    "It delays the confirmation email by 15 minutes",
    "It blocks anyone from booking within 15 days"
   ],
   "correct": 0,
   "explain": "A buffer adds protected time after each appointment so consecutive bookings do not stack directly against each other or other responsibilities."
  },
  {
   "q": "After a successful test booking, in which three places should you be able to verify it inside GHL?",
   "options": [
    "Sites, Memberships, and Payments",
    "Only in the Calendars area, since bookings are calendar data",
    "The calendar's Appointments view, the Contacts list, and the Appointments area on the contact's record",
    "The funnel Stats tab, the Media Library, and Settings"
   ],
   "correct": 2,
   "explain": "One booking writes to three places: the calendar/appointments view, a new or existing contact record, and that contact's own appointments area."
  }
 ],
 "11": [
  {
   "q": "What is a global section in the GHL website builder?",
   "options": [
    "A section that automatically translates into every language",
    "A section only visible to logged-in members",
    "A full-width section that ignores mobile view settings",
    "A section stored once and referenced by many pages, so editing it anywhere updates it everywhere"
   ],
   "correct": 3,
   "explain": "Global sections like a Site Header or Site Footer are saved once and reused across pages, so one edit propagates to every page that uses them."
  },
  {
   "q": "What is the difference between an A record and a CNAME record?",
   "options": [
    "An A record points a root domain at an IP address; a CNAME points a subdomain at another hostname",
    "An A record is for email and a CNAME is for websites",
    "A CNAME points a domain at an IP address; an A record points at a hostname",
    "They are interchangeable names for the same DNS record type"
   ],
   "correct": 0,
   "explain": "An A record maps a root domain like yourgym.com to an IP address, while a CNAME maps a subdomain like go.yourgym.com to another hostname, which GHL supplies on its Add Domain screen."
  },
  {
   "q": "Where are the DNS records created when connecting a custom domain to GHL?",
   "options": [
    "Inside GHL under Settings, Domains",
    "At the domain registrar, such as GoDaddy, Namecheap, or Cloudflare",
    "In the Stripe dashboard",
    "In the website's SEO Meta Data settings"
   ],
   "correct": 1,
   "explain": "DNS records live at the registrar, not in GHL; GHL tells you which records to create, you add them at the registrar, then return to GHL to verify, and SSL is issued automatically once verified."
  },
  {
   "q": "What is the common agency convention when a client already has a live website on their main domain?",
   "options": [
    "Replace the client's existing site with the GHL website immediately",
    "Buy a brand-new domain for every funnel",
    "Point GHL at a subdomain like go.yourgym.com or book.yourgym.com so the existing site is untouched",
    "Host the funnels on the agency's own domain"
   ],
   "correct": 2,
   "explain": "Using a fresh subdomain for GHL carries zero risk to the client's existing site, whereas changing the root domain's A record could take a live site down."
  },
  {
   "q": "Which of these is part of properly publishing a blog post in GHL for SEO?",
   "options": [
    "Pasting the post content into the website's footer",
    "Buying a custom domain before the post can go live",
    "Adding at least three external backlinks before publishing",
    "Setting an SEO title, meta description, and URL slug in the post's SEO settings before publishing"
   ],
   "correct": 3,
   "explain": "GHL's native blog engine lets you set an SEO title, meta description, and slug on each post, plus a cover image, category, and author, before you hit Publish."
  }
 ],
 "12": [
  {
   "q": "Which card number do you use to complete purchases in Stripe test mode?",
   "options": [
    "4242 4242 4242 4242 with any future expiry, any 3-digit CVC, and any ZIP",
    "Your own real card, as long as the amount is small",
    "1111 2222 3333 4444 with the current month as expiry",
    "Any 16-digit number, since test mode accepts everything"
   ],
   "correct": 0,
   "explain": "Stripe's magic test card 4242 4242 4242 4242 works with any future expiry, CVC, and ZIP, but only in test mode; never test with a real card."
  },
  {
   "q": "Your test order form shows $0.00 or errors out at checkout. What is the most common beginner cause?",
   "options": [
    "The funnel has too many steps",
    "The sales page button uses Go to Next Step instead of a URL",
    "No product was attached to the order form step's Products tab",
    "The coupon code was left blank"
   ],
   "correct": 2,
   "explain": "Attaching the product and price on the order step's Products tab is what tells the checkout what to charge; forgetting it is the number one reason order forms show $0.00 or fail."
  },
  {
   "q": "What is the difference between an order bump and a one-click upsell?",
   "options": [
    "A bump is a discount code; an upsell is a free bonus product",
    "An upsell appears before checkout and a bump appears after payment",
    "Bumps only work on recurring products and upsells only on one-time products",
    "A bump is a checkbox add-on inside the checkout before paying; an upsell is a post-purchase offer charged to the saved card in one click"
   ],
   "correct": 3,
   "explain": "The bump renders as a checkbox offer inside the order form before payment, while the one-click upsell comes after purchase and charges the already-saved card without re-entering details."
  },
  {
   "q": "In GHL's product setup, where does the one-time versus recurring choice actually live?",
   "options": [
    "It is a sub-account level setting that applies to all products",
    "At the price level, so one product can carry both one-time and recurring prices",
    "At the product level, so each product is permanently one-time or recurring",
    "It is set on the order form element, not on the product"
   ],
   "correct": 1,
   "explain": "One-time versus recurring is a price-level setting, meaning a single product can offer multiple prices such as a monthly and an annual option."
  },
  {
   "q": "During a test purchase the 4242 4242 4242 4242 card is declined. What does this most likely mean?",
   "options": [
    "You are accidentally in live mode somewhere, and should stop and fix the integration",
    "The card expired and you need a different test number",
    "Stripe is down and you should retry in an hour",
    "The product price is too low for Stripe to process"
   ],
   "correct": 0,
   "explain": "Stripe accepts the 4242 card in test mode only, so a decline is the signal that some part of the setup is running in live mode and must be fixed before continuing."
  }
 ],
 "13": [
  {
   "q": "What is the content hierarchy of a GHL course under Memberships?",
   "options": [
    "Funnel, then Steps, then Pages",
    "A Product (the course) holds Categories (modules), which hold Lessons (posts)",
    "An Offer holds Products, which hold Categories only",
    "A Website holds Courses, which hold Blog posts"
   ],
   "correct": 1,
   "explain": "The course engine mirrors the builder's logic: the Product is the course, Categories act as modules or weeks, and Lessons (called Posts in some versions) hold the content."
  },
  {
   "q": "In GHL Memberships, what is the relationship between a product and an offer?",
   "options": [
    "A product sets the price and an offer holds the lessons",
    "Offers and products are the same object with two names",
    "Each product can only ever have one offer attached to it",
    "The product is the content; the offer is the purchasable wrapper that grants access at a price, and one product can sit behind several offers"
   ],
   "correct": 3,
   "explain": "Courses are not sold directly: offers wrap access and price, so the same course can have both a free preview offer and a paid offer without duplicating content."
  },
  {
   "q": "What is a magic link in the context of the client portal?",
   "options": [
    "A tokenized login URL generated per contact that logs a member in without a password",
    "A shortened URL for sharing the sales page on social media",
    "A hidden admin URL for editing the course",
    "A link that automatically applies a coupon at checkout"
   ],
   "correct": 0,
   "explain": "Magic links let members log into the portal without a password, which cuts down on I-can't-log-in support tickets, and merge fields exist to drop them into emails."
  },
  {
   "q": "You set the Week 2 category to unlock 7 days after enrollment. What feature are you using, and when is it the right choice?",
   "options": [
    "The Draft state; best for content that is not finished yet",
    "An order bump; best for adding a paid add-on at checkout",
    "Drip; best for pacing cohorts and reducing refunds, whereas all-at-once suits reference vaults",
    "A magic link; best for passwordless login"
   ],
   "correct": 2,
   "explain": "Drip settings delay category unlocks relative to enrollment, which paces members through cohort-style content, while all-at-once release fits reference libraries."
  },
  {
   "q": "Members report the course portal looks empty even though you built all the lessons. What is the most likely cause?",
   "options": [
    "The course thumbnail was never uploaded",
    "The lessons were left in Draft state instead of being flipped to Published",
    "The Stripe integration is in test mode",
    "The category names contain special characters"
   ],
   "correct": 1,
   "explain": "Each lesson has a Draft/Published state, and unpublished lessons do not appear in the member portal, so every lesson must be flipped to Published."
  }
 ],
 "14": [
  {
   "q": "In the Week 2 speed drill, what should you be able to build from memory in under 60 minutes?",
   "options": [
    "A full 4-page website with blog and custom domain",
    "A 3-product order funnel with bump and upsell",
    "A 2-step opt-in funnel with hero, bullets, wired form, privacy line, thank-you page, mobile check, and a verified test submission",
    "A 6-lesson membership course with two offers"
   ],
   "correct": 2,
   "explain": "The drill mirrors the most common employer test task: a 2-step opt-in funnel built end to end, mobile-checked, with a live test submission landing in Contacts."
  },
  {
   "q": "According to the portfolio audit, what are the fastest amateur tells in a portfolio website review?",
   "options": [
    "Too many testimonials on the home page",
    "Inconsistent fonts and multiple different button styles across the site",
    "Using free Unsplash photos instead of paid stock images",
    "Having fewer than ten pages"
   ],
   "correct": 1,
   "explain": "The consistency pass enforces one headline font, one body font, a 2-3 color palette, and identical button styling site-wide, because inconsistency reads as amateur instantly."
  },
  {
   "q": "You want a Free Intro Session CTA button to appear in the header of all four website pages. What is the efficient way to do it?",
   "options": [
    "Add the button manually to each of the four pages",
    "Create a popup that loads on every page",
    "Add the button to the footer instead, since headers cannot hold buttons",
    "Edit the Site Header global section once, and every page using it updates automatically"
   ],
   "correct": 3,
   "explain": "Because the header is a global section, adding the CTA button in one edit propagates it to every page that references that section."
  },
  {
   "q": "After the full visitor test pass (purchase, guide download, booking), where do you verify the whole trail inside GHL?",
   "options": [
    "The contact in Contacts with the purchase, the charge in Payments Transactions, the booking in Calendars, and the opt-in tag on the contact",
    "Only in the Stripe dashboard, since GHL does not store transactions",
    "In the funnel Stats tab, which aggregates everything",
    "In the Media Library and the blog analytics"
   ],
   "correct": 0,
   "explain": "The end-to-end journey should leave verifiable traces in Contacts, Payments Transactions, Calendars, and the contact's tags, proving the whole system is connected."
  },
  {
   "q": "Which pairing from the Week 2 closed-book knowledge check is correct?",
   "options": [
    "Order bump: a one-click offer shown after payment completes",
    "Post-booking redirect: configured in the funnel's Settings tab",
    "Product versus offer: the offer holds the lessons and the product sets the price",
    "A record versus CNAME: the A record points a root domain at an IP address, the CNAME points a subdomain at another hostname"
   ],
   "correct": 3,
   "explain": "The A record and CNAME distinction is the correct pairing; the bump comes before payment, the post-booking redirect lives in calendar settings, and the product is the content while the offer carries the price."
  }
 ],
 "15": [
  {
   "q": "In GHL, what is the basic anatomy of every workflow?",
   "options": [
    "A list of scheduled emails that send on fixed calendar dates",
    "One or more triggers that enroll a contact, followed by a vertical chain of actions the contact rides step by step",
    "A single trigger connected to a single action, one pair per workflow",
    "A set of if/else branches with no entry event required"
   ],
   "correct": 1,
   "explain": "A workflow is always one or more triggers (the event that pulls a contact in) followed by a top-to-bottom chain of actions."
  },
  {
   "q": "A client says a workflow \"isn't firing\" for anyone. Based on Day 15's rule of thumb, what is the first thing to check?",
   "options": [
    "Whether the account has run out of email credits",
    "Whether the contact has too many tags",
    "Whether the workflow uses a premium trigger",
    "Whether the workflow is still in Draft, since a Draft workflow never enrolls anyone"
   ],
   "correct": 3,
   "explain": "Roughly half of all 'not firing' complaints are simply a workflow left in Draft — Drafts never enroll contacts."
  },
  {
   "q": "What does the Allow Re-Entry setting do when it is OFF (its default)?",
   "options": [
    "A contact can only ever go through the workflow once, even if the trigger fires again",
    "The workflow stops sending messages after the first reply",
    "The workflow can only be triggered manually with the Test button",
    "Contacts are removed from the workflow at the end of each day"
   ],
   "correct": 0,
   "explain": "With Re-Entry OFF a contact can only pass through once; ON lets them re-enroll every time the trigger fires again."
  },
  {
   "q": "What is the difference between testing with the Test Workflow button versus adding the trigger tag to a test contact?",
   "options": [
    "The Test button skips all Wait steps, while the tag runs them in real time",
    "The Test button only works on Draft workflows, while the tag only works on Published ones",
    "The Test button pushes a chosen contact through the action steps on demand, while firing the tag tests that the trigger itself works",
    "There is no difference — both do exactly the same thing"
   ],
   "correct": 2,
   "explain": "The Test button exercises the action chain on demand, but only firing the real trigger (adding the tag) proves the trigger configuration works — you need both tests."
  },
  {
   "q": "During Week 3 practice on a trial account, SMS steps show \"pending\" or \"failed\" in the Execution Logs. What is the most likely reason?",
   "options": [
    "The SMS action was placed after a Wait step",
    "US/Canada texting requires A2P 10DLC carrier registration, which the trial account has not completed",
    "SMS actions only run inside the contact's timezone window",
    "The workflow's Stop on Response setting is blocking outbound texts"
   ],
   "correct": 1,
   "explain": "Without A2P 10DLC registration, SMS from a trial number won't reliably deliver — pending/failed log lines are expected, not a build bug."
  }
 ],
 "16": [
  {
   "q": "In the Speed to Lead workflow, why must the Form Submitted trigger have a filter for the specific form (New Patient Inquiry)?",
   "options": [
    "Without the filter, every form submission on the entire account would fire the workflow",
    "Without the filter, the trigger cannot pass merge fields into the emails",
    "The trigger will not save unless at least one filter is added",
    "The filter is what publishes the form to the public web"
   ],
   "correct": 0,
   "explain": "An unfiltered Form Submitted trigger fires for EVERY form on the account — a classic rookie bug."
  },
  {
   "q": "Why is Stop on Response set to OFF in the Speed to Lead workflow?",
   "options": [
    "Because Stop on Response only works with SMS, not email",
    "Because it conflicts with the Allow Re-Entry setting",
    "Because the If/Else branch handles replies itself, and turning it ON would remove replied contacts before the Replied branch could run",
    "Because leaving it ON would delay the instant welcome email"
   ],
   "correct": 2,
   "explain": "The workflow branches on the replied tag at the If/Else, so Stop on Response ON would yank replied contacts out before that branch runs."
  },
  {
   "q": "How is the \"Helper — Mark Replied\" workflow built?",
   "options": [
    "Trigger: Form Submitted; action: Send Internal Notification; Re-Entry OFF",
    "Trigger: Tag Added replied; action: Send Email; Re-Entry OFF",
    "Trigger: Contact Created; action: Add Contact Tag new-lead; Re-Entry ON",
    "Trigger: Customer Replied; single action: Add Contact Tag replied; with Allow Re-Entry ON"
   ],
   "correct": 3,
   "explain": "The helper listens for Customer Replied and stamps a replied tag every time (Re-Entry ON), so any other workflow can branch on it."
  },
  {
   "q": "How does GHL implement missed-call text-back for Summit Dental?",
   "options": [
    "With a workflow using the Inbound Webhook trigger",
    "As a dedicated built-in setting (in Business Profile or the phone number's settings) — no workflow needed",
    "With a workflow triggered on Customer Replied",
    "Through the calendar's confirmation settings"
   ],
   "correct": 1,
   "explain": "Missed Call Text Back ships as a native feature toggled in Settings (Business Profile or Phone Numbers), not as a workflow."
  },
  {
   "q": "Your test lead Sally never enrolled in Speed to Lead after submitting the form. Per Day 16, which trio of causes explains this 90% of the time?",
   "options": [
    "Workflow left in Draft, trigger filter pointing at a different form, or an old cached version of the form was submitted",
    "DND enabled, A2P not registered, or email credits exhausted",
    "Too many actions in the chain, a missing Wait step, or an unnamed trigger",
    "The pipeline is archived, the tag is misspelled, or the calendar is inactive"
   ],
   "correct": 0,
   "explain": "The Day 16 warning names Draft status, a trigger filter aimed at the wrong form, and a cached old form as the three checks to run first."
  }
 ],
 "17": [
  {
   "q": "Why do the appointment reminders use the Wait action's Event/Appointment Time mode instead of plain time delays?",
   "options": [
    "Because time delays cannot be longer than 24 hours",
    "Because appointment-anchored waits are free while time delays are premium-metered",
    "Because anchored waits fire relative to the appointment start time (24 h and 1 h before), no matter when the contact booked",
    "Because time delays ignore the workflow's sending window"
   ],
   "correct": 2,
   "explain": "The Event/Appointment Time wait parks the contact until a moment relative to their booking, so reminders land at exactly 24 h and 1 h before regardless of booking time."
  },
  {
   "q": "A patient books an appointment only 3 hours before the slot, but the workflow contains a \"wait until 24 h before\" step. What is the interviewer-grade edge case here?",
   "options": [
    "The workflow will refuse to enroll the contact at all",
    "The 24 h reminder will send exactly 24 hours after booking instead",
    "The appointment is automatically pushed back to satisfy the wait",
    "The wait target is already in the past, so you must check how the Wait panel handles it (e.g. a skip/continue-immediately option)"
   ],
   "correct": 3,
   "explain": "When someone books inside the wait window the anchor time has already passed, and the Wait panel's skip/continue setting decides what happens."
  },
  {
   "q": "Why is Stop on Response OFF for the reminders workflow (A) but ON for No-Show Recovery (B)?",
   "options": [
    "Because Stop on Response cannot be combined with appointment triggers",
    "In A, a reply like \"thanks!\" must not cancel the remaining reminders; in B, a reply means a human takes over and the day-2 nudge must not send",
    "Because B uses SMS and A uses email only",
    "Because A has Re-Entry ON and the two settings must always be opposite"
   ],
   "correct": 1,
   "explain": "Same switch, opposite correct answer: reminders must survive a reply, while a no-show who replies should be handled by a human, not the automated nudge."
  },
  {
   "q": "Which trigger configuration starts the No-Show Recovery workflow?",
   "options": [
    "Appointment Status trigger filtered to status No-Show and calendar New Patient Consult",
    "Contact Tag trigger filtered to tag no-show-recovery",
    "Customer Replied trigger filtered to the reminder SMS",
    "Pipeline Stage Changed trigger filtered to stage Lost"
   ],
   "correct": 0,
   "explain": "No-Show Recovery fires on the Appointment Status trigger with two filters: status is No-Show and calendar is New Patient Consult."
  },
  {
   "q": "Per Day 17's pro tip, what are the two things a hiring manager checks in an appointment-reminder test task?",
   "options": [
    "That every message has an SMS twin and uses emojis sparingly",
    "That the workflow has at least five actions and a goal event",
    "That the waits are anchored to the appointment time (not fixed delays) and the trigger is filtered to one calendar",
    "That Re-Entry is OFF and the time window is 24/7"
   ],
   "correct": 2,
   "explain": "The two hallmarks reviewers look for are appointment-anchored waits and a trigger filtered to a single calendar."
  }
 ],
 "18": [
  {
   "q": "What happens when a contact meets a Goal event while sitting in a Wait step mid-sequence?",
   "options": [
    "They restart the workflow from the first action",
    "They immediately jump forward to the goal step from wherever they are, skipping every message in between",
    "They exit the workflow with no further actions ever running",
    "The goal is queued and applied only after the current Wait finishes"
   ],
   "correct": 1,
   "explain": "A met goal yanks the contact forward to the goal step instantly, skipping intermediate steps — that is how drips stop the moment someone converts."
  },
  {
   "q": "Testy matches both the \"Has insurance\" branch (Branch 1) and the \"VIP\" branch (Branch 2) of a multi-branch If/Else. Which branch does he take, and why?",
   "options": [
    "Both branches — GHL clones the contact down every matching path",
    "The None/Else branch, because multiple matches cancel out",
    "The VIP branch, because tag conditions outrank field conditions",
    "Has insurance, because GHL evaluates branches top to bottom and the contact takes the first branch that matches"
   ],
   "correct": 3,
   "explain": "Branch order matters: evaluation is top-to-bottom and the first matching branch wins, which is why reordering the branches changes the outcome."
  },
  {
   "q": "What is the difference between Custom Fields and Custom Values?",
   "options": [
    "Custom Fields are per-contact data that differ for everyone; Custom Values are per-account constants set once in Settings and identical in every message",
    "Custom Fields work only in email; Custom Values work only in SMS",
    "Custom Values are per-contact; Custom Fields are account-wide constants",
    "They are two names for the same merge-field system"
   ],
   "correct": 0,
   "explain": "Fields hold per-contact data like insurance provider; values hold account-wide constants like booking_link, so one edit updates every workflow — key for portable snapshots."
  },
  {
   "q": "A workflow's Execution Logs show it ran, but the SMS step was skipped for one contact and nothing was sent. Per Day 18's failure catalog, what is the most common cause?",
   "options": [
    "The workflow was left in Draft",
    "The trigger filter pointed at the wrong form",
    "The contact has DND (Do Not Disturb) enabled for the SMS channel",
    "The Go To action created an infinite loop"
   ],
   "correct": 2,
   "explain": "\"The workflow ran but nothing sent\" is DND more often than anything else — the skipped step is visible in the Execution Logs."
  },
  {
   "q": "What is the compressed-test pattern for a 7-day nurture drip?",
   "options": [
    "Publish it and wait a full week before checking the logs",
    "Use the Test Workflow button, which automatically skips all Wait steps",
    "Delete the Wait steps entirely for testing, then rebuild them",
    "Build with minute-long waits, verify both paths in the Execution Logs, then switch the waits to real day-long durations before shipping"
   ],
   "correct": 3,
   "explain": "Professionals test long automations with minutes-long waits, confirm the logs, then restore production durations — never ship a 7-day sequence watched for 7 seconds."
  }
 ],
 "19": [
  {
   "q": "Which practice constitutes prohibited \"review gating\" under Google's review policies?",
   "options": [
    "Sending a review request by both email and SMS",
    "Asking for a review the same day as the visit",
    "Asking happy customers for public reviews while diverting unhappy ones away from Google",
    "Including a private feedback link alongside the public review link"
   ],
   "correct": 2,
   "explain": "Gating means steering only happy customers to Google; the compliant pattern gives everyone the public review link plus an optional private feedback channel."
  },
  {
   "q": "The Review Request workflow triggers on Tag Added: visit-complete rather than directly on Appointment Status = Showed. Why is the tag version preferred?",
   "options": [
    "It decouples the review machine from the calendar, so any future \"visit complete\" source can start it",
    "Appointment Status triggers cannot be combined with Wait actions",
    "Tags fire faster than appointment status changes",
    "The Showed status is a premium trigger on most plans"
   ],
   "correct": 0,
   "explain": "Triggering on the tag makes the workflow source-agnostic — anything that stamps visit-complete (Day 17's Post-Visit workflow or any future source) can feed it."
  },
  {
   "q": "What is the launch pattern for the Database Reactivation campaign?",
   "options": [
    "Point the workflow trigger at Contact Created so old contacts re-enroll",
    "Export the lapsed list to CSV and re-import it to fire Form Submitted",
    "Email the whole database from the Conversations screen",
    "Filter contacts into a saved Smart List, then bulk-apply the launch tag (dbr-spring) that the workflow's Tag Added trigger listens for"
   ],
   "correct": 3,
   "explain": "The pro pattern is Smart List → bulk Add Tag: you control exactly who and when by controlling the tag, and can rerun later with a new tag."
  },
  {
   "q": "In the DBR workflow, the goal step is followed by Create Opportunity. What bug does this create, and what is the fix?",
   "options": [
    "The goal blocks the opportunity from ever being created; fix by moving Create Opportunity above the goal",
    "Contacts finishing all 3 touches without converting also reach the goal step and get an opportunity; fix by setting the goal's \"if not met\" behavior to End the workflow",
    "Repliers get two opportunities; fix by turning Re-Entry OFF",
    "The opportunity lands in the wrong pipeline; fix by renaming the stage"
   ],
   "correct": 1,
   "explain": "Non-converters flow through to the goal after touch 3, so the goal's unmet setting must End them there so only goal-meeters proceed to the opportunity actions."
  },
  {
   "q": "Why is Stop on Response OFF in the DBR workflow even though a reply matters?",
   "options": [
    "Because Stop on Response cannot be used with time windows",
    "Because DBR sends only email, and Stop on Response only reads SMS",
    "Because the reply is handled by the goal (via the replied tag), which exits the contact forward into the opportunity — Stop on Response would remove them before the goal could",
    "Because Re-Entry OFF already covers reply handling"
   ],
   "correct": 2,
   "explain": "A reply must move the contact forward through the goal into the Reactivation pipeline; Stop on Response would eject them before that exit fires."
  }
 ],
 "20": [
  {
   "q": "How do pipelines and workflows interact, per Day 20's \"both directions\" lesson?",
   "options": [
    "A stage change can trigger a workflow, AND a workflow action can move an opportunity to a new stage — so you must guard against loops where a stage-move re-fires its own trigger",
    "Workflows can only read pipeline stages, never change them",
    "Pipelines can only be updated manually by dragging cards",
    "Stage changes trigger workflows only when the opportunity is created by a form"
   ],
   "correct": 0,
   "explain": "Pipeline Stage Changed can trigger workflows, and Update/Create Opportunity actions can move stages — powerful, but a stage-move that re-fires its own trigger creates a loop."
  },
  {
   "q": "Round-robin exists in two places in GHL. What are they?",
   "options": [
    "The Settings tab of a workflow and the trigger's advanced options",
    "The Contacts bulk-action bar and the Reputation module",
    "The snapshot loader and the sub-account creation screen",
    "The Assign to User workflow action (distributes contacts) and the calendar's team settings (distributes bookings)"
   ],
   "correct": 3,
   "explain": "Contacts vs appointments — different round-robins: the Assign to User action rotates new contacts across users, while the calendar's team setting rotates bookings among staff."
  },
  {
   "q": "What is the difference between the Webhook action and the Inbound Webhook trigger?",
   "options": [
    "The action is free while the trigger is always included in the base plan",
    "The Webhook action sends data OUT from GHL to any URL when a step runs; the Inbound Webhook trigger gives you a GHL URL that outside systems POST to, starting a workflow",
    "The action only works with GET requests; the trigger only works with PUT",
    "They are identical except the trigger requires custom headers"
   ],
   "correct": 1,
   "explain": "Webhook action = GHL talks OUT; Inbound Webhook trigger = the world talks IN — the two doors behind every GHL-to-n8n integration."
  },
  {
   "q": "Inspecting the outbound webhook payload on webhook.site, what do you find for the contact's tags?",
   "options": [
    "A single comma-separated string value",
    "Tags are omitted from webhook payloads for privacy",
    "A list/array of values, unlike simple string fields such as email",
    "A count of tags rather than the tag names"
   ],
   "correct": 2,
   "explain": "The payload's tags key holds an array (list), while fields like first name, email, and the long contact id are strings — a key JSON-reading distinction for n8n work."
  },
  {
   "q": "Why should internal notifications be sent to the contact's \"assigned user\" rather than a hard-coded staff member?",
   "options": [
    "Hard-coded recipients break when the client's team changes, while \"assigned user\" pairs with round-robin so each staff member automatically gets their own leads, alerts, and tasks",
    "Hard-coded recipients count as premium executions",
    "Assigned-user notifications skip the sending time window",
    "GHL only allows one hard-coded recipient per workflow"
   ],
   "correct": 0,
   "explain": "Round-robin assigns the lead, then notifications and tasks targeting \"assigned user\" scale forever as the team changes — a design instinct interviewers notice."
  }
 ],
 "21": [
  {
   "q": "Which of these does a GHL snapshot NOT carry into a new sub-account?",
   "options": [
    "Workflows and pipelines",
    "Contacts, conversation history, connected integrations (Google, Stripe), phone numbers, and A2P registration",
    "Custom fields, custom values, and tags",
    "Forms, funnels, and calendars"
   ],
   "correct": 1,
   "explain": "Snapshots carry structure (workflows, pipelines, forms, funnels, calendars, fields, values, tags) but never data or credentials — that gap becomes the post-load checklist."
  },
  {
   "q": "After loading the snapshot into ZZ Test Clinic, what should you check about the arrived workflows?",
   "options": [
    "That their execution logs transferred with them",
    "That the Training folder practice workflows also arrived",
    "That the original Summit Dental workflows were deleted",
    "Their Draft/Published state — many versions deliberately load workflows as Drafts"
   ],
   "correct": 3,
   "explain": "Loaded workflows often arrive as Drafts on purpose, so verifying and publishing them after review is part of the onboarding procedure."
  },
  {
   "q": "Which of these belongs on the post-load onboarding checklist for a snapshot deployment?",
   "options": [
    "Update custom values like booking_link to the new client's own calendar URL, reconnect integrations, claim a phone number, and start A2P registration",
    "Re-import the source account's contacts so the pipelines are not empty",
    "Delete the snapshot from Agency View so it cannot be reused",
    "Rename the sub-account to match the snapshot name"
   ],
   "correct": 0,
   "explain": "Everything a snapshot cannot carry — integrations, phone/A2P, client-specific custom values, staff assignments — must be redone manually after loading."
  },
  {
   "q": "In the naming convention \"[SD] Speed to Lead v1\", what do the three parts represent?",
   "options": [
    "Software Division, the trigger name, and the GHL app version",
    "The folder name, the pipeline, and the number of actions",
    "Prefix = client, name = the system, version = change safety",
    "Sub-Domain, the calendar, and the snapshot count"
   ],
   "correct": 2,
   "explain": "Client prefix, system name, and version number keep an agency with dozens of sub-accounts orderly and make edits safe (duplicate to v2 before major changes)."
  },
  {
   "q": "Why do agencies sell snapshots like \"Dental Growth Suite v1\" as products?",
   "options": [
    "Because GHL pays agencies a commission on every snapshot load",
    "A snapshot converts weeks of expert configuration into a one-click deployable product with near-zero marginal cost, reusable for every client in the niche",
    "Because snapshots include the client's contact list, which has resale value",
    "Because snapshots automatically renew client subscriptions"
   ],
   "correct": 1,
   "explain": "The same niche suite deploys to every similar client in one click, so the expert work is done once and sold repeatedly ($97-$997 is a normal range)."
  }
 ],
 "22": [
  {
   "q": "In an n8n Webhook node, what is true about the Test URL?",
   "options": [
    "It works any time the workflow is saved, even with the editor closed",
    "It contains /webhook-test/ and only works while the editor is listening after you press Test workflow",
    "It contains /webhook/ and only works when the workflow is Active",
    "It is the URL you should paste into a client's live GHL workflow"
   ],
   "correct": 1,
   "explain": "The Test URL (containing /webhook-test/) only listens after you click Test workflow with the editor open, and it shows results live on the canvas."
  },
  {
   "q": "You call a workflow's Production URL while it is Active. Where do you see the results of that run?",
   "options": [
    "The nodes animate green on the canvas in real time",
    "In the browser console of the n8n editor",
    "In the Webhook node's parameter panel",
    "In the Overview > Executions list, not on the canvas"
   ],
   "correct": 3,
   "explain": "Production runs never animate on the canvas; they appear only as entries in the Executions list, which you open to inspect each node's input and output."
  },
  {
   "q": "How does data flow between nodes in n8n?",
   "options": [
    "Every node outputs a list of items, each a JSON object, and most nodes run once per incoming item",
    "Every node outputs a single plain-text string that the next node parses",
    "Nodes share one global variable store that any node can read",
    "Data only flows when you manually copy it between node panels"
   ],
   "correct": 0,
   "explain": "Everything in n8n is items flowing between nodes: each node outputs a list of JSON items, and sending 5 items into a Gmail node sends 5 emails."
  },
  {
   "q": "What happens to pinned node output data when a workflow runs in production?",
   "options": [
    "It replaces the live data so every production run uses the pinned payload",
    "It causes the workflow to error until you unpin it",
    "It is ignored - pinned data is used in tests only",
    "It is appended to the live data as an extra item"
   ],
   "correct": 2,
   "explain": "Pinned data lets downstream nodes reuse a captured payload during testing, but production executions ignore pins entirely."
  },
  {
   "q": "When does a Schedule Trigger actually fire on its schedule?",
   "options": [
    "As soon as the workflow is saved, active or not",
    "Only while the workflow's toggle is set to Active",
    "Only while the editor tab is open",
    "Only after at least one manual Test workflow run"
   ],
   "correct": 1,
   "explain": "A Schedule Trigger fires on its schedule only while the workflow is Active; Test workflow runs it manually regardless of that toggle."
  }
 ],
 "23": [
  {
   "q": "Why must the GHL Webhook workflow action use POST when sending leads to n8n?",
   "options": [
    "POST is the only method GHL supports for any action",
    "GET is blocked by n8n's firewall",
    "A GET sends no body, so n8n would receive an empty item instead of the lead's JSON",
    "POST requests skip the n8n Executions log for privacy"
   ],
   "correct": 2,
   "explain": "GHL sends the lead as a JSON body, and a GET request carries no body, so n8n would receive an empty item."
  },
  {
   "q": "GHL POSTs a lead to your n8n webhook. Which expression reads the lead's first name?",
   "options": [
    "{{ $json.body.first_name }}",
    "{{ $json.first_name }}",
    "{{ $json.query.first_name }}",
    "{{ $json.headers.first_name }}"
   ],
   "correct": 0,
   "explain": "GHL's fields arrive in the body of the request, so expressions read them under $json.body, like $json.body.first_name."
  },
  {
   "q": "You press Test workflow, then get distracted for ten minutes before submitting the GHL form. Nothing arrives in n8n. What is the likely cause?",
   "options": [
    "The GHL form only fires webhooks once per hour",
    "Google Sheets is blocking the webhook",
    "n8n test webhooks require a GET request",
    "The test listener only waits a couple of minutes per click, so you must press Test workflow again just before submitting"
   ],
   "correct": 3,
   "explain": "The n8n test listener stops after a couple of minutes, so you should press Test workflow again right before each form submission."
  },
  {
   "q": "What is the correct production cutover for the Lead Logger integration?",
   "options": [
    "Keep the test URL in GHL but leave the n8n editor tab open forever",
    "Unpin the webhook data, activate the n8n workflow, then replace the test URL in the GHL Webhook action with the production URL and re-publish",
    "Delete the Webhook node and recreate it in production mode",
    "Change the GHL webhook method from POST to GET"
   ],
   "correct": 1,
   "explain": "Cutover means unpinning, saving, toggling Active, and swapping the GHL Webhook action's URL to the production URL (containing /webhook/) before saving and re-publishing."
  },
  {
   "q": "How do you send an extra value like source = New Patient Inquiry form in the GHL webhook payload?",
   "options": [
    "Add a key/value pair in the Webhook action's Custom Data section",
    "Append it to the URL as a path segment",
    "Edit the contact record to include a source note",
    "It is impossible - GHL only sends standard contact fields"
   ],
   "correct": 0,
   "explain": "The Webhook action's Custom Data section lets you add your own key/value pairs on top of the standard contact fields GHL sends automatically."
  }
 ],
 "24": [
  {
   "q": "What is the base URL for GHL API 2.0?",
   "options": [
    "https://api.gohighlevel.com",
    "https://app.n8n.cloud",
    "https://marketplace.gohighlevel.com",
    "https://services.leadconnectorhq.com"
   ],
   "correct": 3,
   "explain": "All GHL API 2.0 calls go to the base URL https://services.leadconnectorhq.com, one of the two golden facts to memorize."
  },
  {
   "q": "Which two headers must accompany every GHL API 2.0 request?",
   "options": [
    "Content-Type: text/html and Accept: */*",
    "X-API-Key: {token} and Location: {locationId}",
    "Authorization: Bearer {token} and Version: 2021-07-28",
    "Authorization: Basic {token} and Date: today"
   ],
   "correct": 2,
   "explain": "Every request needs Authorization: Bearer {token} and Version: 2021-07-28, and a missing Version header is the most common beginner 4xx."
  },
  {
   "q": "What is true about a GHL Private Integration token?",
   "options": [
    "It can be viewed again any time from the Private Integrations screen",
    "It is created per sub-account in Settings > Private Integrations, starts with pit-, and is shown only once",
    "It is created in Agency View and works across all sub-accounts",
    "It requires an OAuth marketplace app to generate"
   ],
   "correct": 1,
   "explain": "Private Integration tokens are created per sub-account under Settings > Private Integrations, begin with pit-, and GHL shows the token only once at creation."
  },
  {
   "q": "After moving the Authorization header into an n8n Header Auth credential, why must the Version header stay in the HTTP Request node?",
   "options": [
    "Header Auth stores exactly one header, so Version must remain as a per-node header",
    "The Version header changes on every request",
    "Credentials cannot store headers at all",
    "GHL rejects the Version header when sent from a credential"
   ],
   "correct": 0,
   "explain": "A Header Auth credential holds exactly one header (Authorization), so the Version: 2021-07-28 header still has to be set on each node."
  },
  {
   "q": "A GHL API call returns 403 even though the token is typed correctly. What is the most likely cause?",
   "options": [
    "The endpoint URL has a typo",
    "You have hit the rate limit",
    "The token is valid but missing a required scope, or it belongs to the wrong sub-account",
    "The JSON body failed validation"
   ],
   "correct": 2,
   "explain": "Per the debugging cheat-sheet, 403 means a valid token that lacks the needed scope or is the wrong sub-account's token, while 401 is a missing or typo'd token."
  }
 ],
 "25": [
  {
   "q": "Why does the AI Lead Qualifier use a Code node with a regex and fallback values after the AI model node?",
   "options": [
    "Because an LLM cannot be trusted to always return clean JSON, so you parse defensively with a fallback score and note",
    "Because n8n cannot connect an AI node directly to an IF node",
    "Because the regex makes the AI respond faster",
    "Because GHL requires all webhook responses to pass through a Code node"
   ],
   "correct": 0,
   "explain": "The Code node grabs the first JSON block from the model's reply and falls back to score 5 with a review-manually summary, so a bad AI reply never crashes the pipeline."
  },
  {
   "q": "How does the workflow decide whether a lead is hot or nurture?",
   "options": [
    "A Filter node checks whether the AI summary contains the word urgent",
    "An IF node checks whether the numeric score is greater than or equal to 7",
    "The Telegram node decides based on message length",
    "GHL scores the lead before sending the webhook"
   ],
   "correct": 1,
   "explain": "An IF node compares {{ $json.score }} with the number 7 using greater-than-or-equal, forking the workflow into hot (true) and nurture (false) branches."
  },
  {
   "q": "How does GHL react to the result of the n8n AI scoring?",
   "options": [
    "n8n edits the GHL workflow directly through the automation API",
    "GHL polls the Google Sheet for new scores every 15 minutes",
    "The AI model logs into GHL and creates the opportunity itself",
    "A GHL workflow triggers on the hot-lead tag that n8n applied via the API - the tag is the handshake between the systems"
   ],
   "correct": 3,
   "explain": "n8n writes the score and applies a tag via the API, and a GHL workflow with a Contact Tag trigger on hot-lead reacts with a notification and opportunity - the tag is the handshake."
  },
  {
   "q": "What does the expression syntax $('Webhook') do in a downstream node?",
   "options": [
    "It creates a brand-new webhook listener",
    "It re-runs the Webhook node with fresh data",
    "It reaches back to the Webhook node's data from anywhere downstream in the workflow",
    "It only works in the node immediately after the webhook"
   ],
   "correct": 2,
   "explain": "The $('Webhook') syntax lets any downstream node read the Webhook node's item, such as $('Webhook').item.json.body.contact_id."
  },
  {
   "q": "Which trio of practices made the AI build robust, per the day's pro tip?",
   "options": [
    "Use the biggest model, retry forever, and email errors to the client",
    "Cache AI replies, disable retries, and branch on the summary text",
    "Let the AI write directly to GHL, skip parsing, and alert on every lead",
    "Demand strict JSON in the prompt, parse with a fallback, and branch on a number rather than prose"
   ],
   "correct": 3,
   "explain": "The three ideas that apply to every AI automation are demanding strict JSON output, parsing with a fallback, and branching on a number instead of prose."
  }
 ],
 "26": [
  {
   "q": "Why does the two-way sync match sheet rows to contacts by GHL Contact ID rather than by email?",
   "options": [
    "Emails are too long to fit in a sheet cell",
    "People change emails, but the Contact ID never changes, so it is the only stable key",
    "The GHL API cannot search contacts by email",
    "Google Sheets cannot store text with an at-sign"
   ],
   "correct": 1,
   "explain": "Emails and names change over time and invite duplicates, while the GHL Contact ID is permanent, making it the only safe long-lived match key."
  },
  {
   "q": "How does the Last Synced column prevent an infinite sync loop?",
   "options": [
    "It locks the row so no workflow can modify it",
    "It tells Google Sheets to reject writes from n8n",
    "It stores an error count that pauses the sync after three failures",
    "The sync stamps it on every write, and the Sheet-to-GHL direction only pushes rows where the stamp is empty, meaning a human typed the row"
   ],
   "correct": 3,
   "explain": "Whenever the sync writes a row it stamps Last Synced, and the Sheet-to-GHL filter only keeps rows with an empty stamp, so machine writes never bounce back."
  },
  {
   "q": "Why is the Google Sheets operation Append or Update Row with column-to-match GHL Contact ID used in the GHL-to-Sheet direction?",
   "options": [
    "It is an upsert: existing IDs update their row in place and unknown IDs create new rows, so re-running the sync never duplicates",
    "It is the only operation the free Sheets plan allows",
    "It deletes rows for contacts removed from GHL",
    "It runs faster than a plain Append operation"
   ],
   "correct": 0,
   "explain": "Append or Update keyed on the Contact ID is the whole upsert pattern: updates in place for known IDs, new rows for unknown ones, and no duplicates on repeat runs."
  },
  {
   "q": "How do you get a Telegram alert whenever either sync workflow fails?",
   "options": [
    "Enable a Notify checkbox on every node in both workflows",
    "Add a Telegram node to the end of each sync workflow",
    "Build a separate workflow starting with an Error Trigger node plus a Telegram node, then select it as the Error Workflow in each sync workflow's settings",
    "Turn on email digests in your n8n Cloud account settings"
   ],
   "correct": 2,
   "explain": "A dedicated workflow with an Error Trigger node sends the alert, and each sync workflow points to it via the Error Workflow option in its settings."
  },
  {
   "q": "You notice executions firing every few seconds. Per the day's warning, what should you do first?",
   "options": [
    "Increase the schedule interval to 30 minutes and keep watching",
    "Deactivate both sync workflows first, then investigate - that pattern is the loop signature",
    "Delete the Google Sheet to stop the trigger",
    "Rotate the Private Integration token"
   ],
   "correct": 1,
   "explain": "Rapid-fire executions are the signature of a sync loop, which can burn API rate limits and execution quotas, so you deactivate both workflows before investigating."
  }
 ],
 "27": [
  {
   "q": "Which API call creates the kickoff task on the new client's GHL contact?",
   "options": [
    "GET https://services.leadconnectorhq.com/tasks with a contactId query parameter",
    "PUT https://services.leadconnectorhq.com/contacts/CONTACT_ID with a tasks array in the body",
    "POST https://services.leadconnectorhq.com/contacts/CONTACT_ID/tasks with a JSON body containing title, body, dueDate, and completed",
    "POST https://services.leadconnectorhq.com/locations/LOCATION_ID/tasks"
   ],
   "correct": 2,
   "explain": "The task is created by POSTing to /contacts/{contactId}/tasks on services.leadconnectorhq.com with the credential and Version: 2021-07-28 header."
  },
  {
   "q": "What makes the GHL onboarding workflow a state machine instead of a simple drip sequence?",
   "options": [
    "A Wait step or Goal Event holds the sequence until the opportunity reaches the Kickoff Scheduled stage, so it reacts to reality instead of a timer",
    "Every email is sent exactly 24 hours apart",
    "n8n pauses the GHL workflow through the API",
    "The workflow re-enrolls the contact every day until they reply"
   ],
   "correct": 0,
   "explain": "The wait-for-stage configuration releases the next email only when the pipeline stage becomes Kickoff Scheduled, reacting to the kickoff actually being booked."
  },
  {
   "q": "How would you convert the capstone demo into a live revenue workflow for a paying client?",
   "options": [
    "Rebuild every n8n node from scratch in production mode",
    "Move the workflow from the sub-account to Agency View",
    "Replace the webhook with a Google Sheets trigger",
    "Swap the trigger from Form Submitted to Payment Received - everything downstream stays identical"
   ],
   "correct": 3,
   "explain": "With Stripe connected, one trigger swap to Payment Received (or Order Form Submission) turns the demo into a live workflow with no downstream changes."
  },
  {
   "q": "During the production cutover, how do you confirm the URL pasted into the GHL Webhook action is the right one?",
   "options": [
    "It should end with the locationId",
    "It must contain /webhook/, not /webhook-test/",
    "It must start with services.leadconnectorhq.com",
    "It must contain /webhook-test/, not /webhook/"
   ],
   "correct": 1,
   "explain": "The production URL contains /webhook/ while the test URL contains /webhook-test/, and pasting the wrong one is the classic silent failure."
  },
  {
   "q": "The task-creation call fails because your Private Integration lacks a tasks scope. What is the fix?",
   "options": [
    "Edit the Private Integration to add the scope, and if GHL regenerates the token, update the n8n credential with the new one",
    "Create a second n8n credential with the same token",
    "Switch the request method from POST to PUT",
    "Add the scope name as an extra request header"
   ],
   "correct": 0,
   "explain": "You add the missing scope in Settings > Private Integrations, remembering that a re-generated token must also be updated in the n8n credential."
  }
 ],
 "28": [
  {
   "q": "According to the permanent honesty rule, how should you present your 13 builds in case studies, Looms, and the portfolio intro?",
   "options": [
    "Imply they were real client projects so the portfolio looks more impressive",
    "Add plausible metrics like 'boosted revenue 30%' to show business impact",
    "State plainly that they are demonstration builds on fictional businesses and never invent metrics",
    "Leave the client names out entirely so nobody can ask about them"
   ],
   "correct": 2,
   "explain": "The honesty rule says to state up front that Summit Dental and Ironworks Fitness are fictional demonstration builds and to never invent results, because confident honest framing is what makes you credible."
  },
  {
   "q": "What is the four-beat structure of the Loom re-recording script, in order?",
   "options": [
    "Hook (the business problem), Tour (show it working live), How (one pass over the workflow), Result (what it would do for a client)",
    "Intro (about you), Demo (the build), Pricing (what it costs), Call to action",
    "Result first, then How, then Tour, then a closing Hook",
    "Problem, Agitate, Solve, Upsell"
   ],
   "correct": 0,
   "explain": "Day 28's script is Hook (15-20s problem), Tour (60-90s showing it work), How (about 30s over the workflow canvas), and Result (15-20s of client value), targeting 2-4 minutes total."
  },
  {
   "q": "Which portfolio pieces need an exported n8n workflow JSON in the audit?",
   "options": [
    "All 13 pieces",
    "Only the capstone, #13",
    "The five flagships #5, #9, #11, #12, #13",
    "The n8n builds, #10 through #13"
   ],
   "correct": 3,
   "explain": "The audit checklist requires 2+ screenshots and 1 Loom for every piece, but workflow JSON exports only for the n8n builds #10-#13."
  },
  {
   "q": "What is the final test you run on the master portfolio document before calling it done?",
   "options": [
    "Send it to a friend and ask if the design looks professional",
    "Open it in an incognito window and click every Loom and case-study link to confirm nothing asks for permission",
    "Run it through a spelling checker and export it as a PDF",
    "Convert it into a GHL funnel, which is required before sharing"
   ],
   "correct": 1,
   "explain": "You set sharing to 'Anyone with the link - Viewer' and then test in incognito, because a hiring manager who hits 'Request access' just closes the tab."
  },
  {
   "q": "Which five builds are the flagships that must be A-grade Looms and each get a one-page case study?",
   "options": [
    "#1, #2, #3, #4, #5",
    "#2, #4, #6, #8, #10",
    "#5, #9, #11, #12, #13",
    "#10, #11, #12, #13 plus any one other build"
   ],
   "correct": 2,
   "explain": "Day 28 names the flagships as #5 speed-to-lead, #9 agency snapshot, #11 AI lead qualifier, #12 GHL-Sheets sync, and #13 the onboarding machine."
  }
 ],
 "29": [
  {
   "q": "Why does Day 29 tell you to apply under four different job titles (GoHighLevel Specialist, GHL Virtual Assistant, Automation Specialist, CRM Manager)?",
   "options": [
    "Each title is a genuinely different skill set you need to learn separately",
    "Recruiters and search boxes match keywords, so searching only one title hides half the market",
    "It lets you apply to the same company four times",
    "VA roles legally require a different resume format"
   ],
   "correct": 1,
   "explain": "The titles are different labels for the same skill set, and because hiring platforms match exact keywords, using all four keeps half the market from staying invisible to you."
  },
  {
   "q": "Besides LinkedIn and Indeed, where does a huge share of GHL hiring actually happen according to Day 29?",
   "options": [
    "Craigslist and local newspapers",
    "GitHub Jobs and Stack Overflow",
    "Twitter/X and Discord servers only",
    "Facebook groups, OnlineJobs.ph, and Upwork"
   ],
   "correct": 3,
   "explain": "Day 29 says GHL hiring is weird: a large share happens in Facebook groups, OnlineJobs.ph, and Upwork, with agency owners posting things like 'need a GHL VA, start Monday.'"
  },
  {
   "q": "What is the personalize-first-2-lines rule for Upwork proposals?",
   "options": [
    "Line 1 names something specific from the client's post and line 2 connects it to a specific build of yours; the saved template starts at line 3",
    "The first two lines must state your hourly rate and availability",
    "You personalize the last two lines and template everything above them",
    "You write two fully custom proposals per day and template the rest"
   ],
   "correct": 0,
   "explain": "The rule at the top of your templates doc is that line 1 references a specific detail from their post, line 2 ties it to one of your builds, and only from line 3 down do you use the saved template."
  },
  {
   "q": "Which of these does Day 29 say to AVOID when writing your LinkedIn headline?",
   "options": [
    "Naming what you build, like funnels and workflows",
    "Mentioning proof, such as 13 recorded demonstration builds",
    "Words like 'Aspiring' or 'Seeking opportunities'",
    "Including the title GoHighLevel and Automation Specialist"
   ],
   "correct": 2,
   "explain": "The headline is search keywords, not a mood, so the formula is title, what you build, and proof, and words like 'Aspiring' or 'Seeking opportunities' are explicitly banned."
  },
  {
   "q": "What application quota do you write at the top of your tracking sheet, starting the day after Day 29?",
   "options": [
    "3 applications per week, quality over quantity",
    "10 applications per weekday, logged same-day, with follow-up after 3-4 days of silence",
    "50 applications on the first day, then wait for replies",
    "1 application per day, but only to perfect-fit roles"
   ],
   "correct": 1,
   "explain": "The quota is 10 applications per weekday logged same-day with follow-ups after 3-4 quiet days, because volume plus a real portfolio is the whole strategy."
  }
 ],
 "30": [
  {
   "q": "In the Q6 debugging checklist for a workflow that did not fire, what do you check FIRST?",
   "options": [
    "Whether the workflow is actually published, not still in draft",
    "Whether the contact has DND enabled",
    "The wait-step logic and from-numbers",
    "The trigger filters like exact tag spelling"
   ],
   "correct": 0,
   "explain": "The checklist order is: published, then execution logs, then trigger filters, then contact state, and only after all four pass do you inspect the action configuration itself."
  },
  {
   "q": "How does Day 30 define a GHL snapshot in the interview answer for Q4?",
   "options": [
    "A daily backup GHL takes of your agency billing data",
    "A screenshot set you attach to every case study",
    "A packaged template of an entire sub-account (pipelines, funnels, workflows, custom fields) deployable to a new sub-account in minutes",
    "A read-only preview link clients use to review a funnel"
   ],
   "correct": 2,
   "explain": "A snapshot packages a whole sub-account's pipelines, funnels, workflows, and custom fields so agencies can deploy a full system into a new sub-account in minutes, which is how they productize onboarding."
  },
  {
   "q": "When an interviewer asks 'How long would X take and what would you charge?', what does Day 30 say is the right move?",
   "options": [
    "Quote the lowest number you can to win the job on the spot",
    "Refuse to discuss pricing until you have a signed contract",
    "Quote double your estimate so you have negotiating room",
    "Give a rough estimate from your build checklist but ask scope questions before committing, because asking scope questions IS the right answer"
   ],
   "correct": 3,
   "explain": "You never bluff a number on the spot: give a rough checklist-based estimate and confirm scope details like number of locations and A2P status, since quoting accurately beats quoting fast."
  },
  {
   "q": "What are the three classic test tasks you practice under time pressure in Session 2?",
   "options": [
    "A written GHL theory exam, a group interview, and a portfolio review",
    "A 60-minute funnel-plus-workflow build, a 5-bug debug drill, and an unrehearsed 3-minute explain-a-build Loom",
    "Building a full agency snapshot, migrating a client, and setting up A2P registration",
    "Rewriting your resume, recording a video intro, and a typing speed test"
   ],
   "correct": 1,
   "explain": "The test-task gym covers the 60-minute opt-in funnel and follow-up workflow build, the self-sabotage debug drill with 5 planted bugs, and a one-take 3-minute Loom explaining the onboarding machine."
  },
  {
   "q": "How does Day 30 tell you to set your starting hourly rate?",
   "options": [
    "Copy the rates quoted in articles and YouTube videos about GHL freelancing",
    "Charge whatever established 10-plus-job freelancers charge, since your skills match theirs",
    "Start free for the first three clients to guarantee reviews",
    "Do 30 minutes of live research on Upwork, OnlineJobs.ph, and job alerts, then position in the realistic band for zero-review newcomers"
   ],
   "correct": 3,
   "explain": "You research today's actual rates for no-review and 10-plus-job freelancers plus posted salaries for 5 roles, then set a starting rate in the realistic newcomer band along with a 3-month target rate."
  }
 ]
};

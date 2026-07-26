// Make.com 14-Day Intensive - per-day self-test data (5 questions per day)
window.MAKE_QUIZZES = {
 "1": [
  {
   "q": "Ana runs a scenario where Google Sheets Search Rows returns 5 rows and an email module then fires once per bundle. Roughly how many operations does that single run cost?",
   "options": [
    "1 operation, because it was one run",
    "2 operations, one per module",
    "6 operations: 1 search plus 5 email sends",
    "50 operations, because operations are billed per row times per module"
   ],
   "correct": 2,
   "explain": "Every module execution is one operation, so 1 search plus 5 per-bundle email sends is about 6 operations."
  },
  {
   "q": "What is the unit Make bills against on every plan?",
   "options": [
    "Scenarios, with a flat monthly fee per active scenario",
    "Operations: every time any module executes once",
    "Connections, billed per linked app account",
    "Minutes of total scenario runtime"
   ],
   "correct": 1,
   "explain": "Make bills per operation, meaning one charge each time any module executes once."
  },
  {
   "q": "How many operations per month does Make's free plan include?",
   "options": [
    "100",
    "500",
    "1,000",
    "10,000"
   ],
   "correct": 2,
   "explain": "The free plan includes 1,000 operations per month, which is plenty for training if you test with small data sets."
  },
  {
   "q": "You export a scenario as a blueprint and import it into a new scenario. What must you re-link because it does not travel with the blueprint file?",
   "options": [
    "The filters between modules",
    "The module mappings",
    "The scenario schedule",
    "The connections (saved app credentials)"
   ],
   "correct": 3,
   "explain": "Blueprints carry modules, mappings, and filters, but connections must be re-linked after import."
  },
  {
   "q": "Why should you flip the scenario switch OFF when you finish each day's training work?",
   "options": [
    "Make deletes scenarios that stay on overnight",
    "A forgotten frequent schedule can burn through the free plan's operations quota in a weekend",
    "Scenarios left on lock their modules from editing",
    "Connections expire while a scenario is running"
   ],
   "correct": 1,
   "explain": "A scenario left on an every-15-minutes schedule keeps consuming operations and can eat a 1,000-operation free plan quickly."
  }
 ],
 "2": [
  {
   "q": "What does an Iterator module do to bundle flow?",
   "options": [
    "It collects many bundles into a single bundle",
    "It filters bundles that fail a condition",
    "It splits one bundle containing an array into many bundles, one per element",
    "It pauses the scenario between bundles"
   ],
   "correct": 2,
   "explain": "An iterator turns 1 bundle holding an array into N bundles, one per array element."
  },
  {
   "q": "Modules placed between an iterator and an aggregator behave how?",
   "options": [
    "They run once per bundle, billing one operation per run",
    "They run exactly once regardless of bundle count",
    "They run only on the first bundle",
    "They run in parallel at no operation cost"
   ],
   "correct": 0,
   "explain": "Everything between an iterator and an aggregator executes once per bundle, and each execution is one operation."
  },
  {
   "q": "Which statement about indexing in Make functions is correct?",
   "options": [
    "Both get() and substring() are 0-based",
    "Both get() and substring() are 1-based",
    "get() is 0-based while substring() is 1-based",
    "get() is 1-based while substring() is 0-based"
   ],
   "correct": 3,
   "explain": "get() grabs array elements starting at 1 while substring() uses zero-based start and end indexes, a classic gotcha."
  },
  {
   "q": "Rebuilding the 5-row email-per-row scenario as one aggregated digest email changes the operation count per run from about 6 to about what?",
   "options": [
    "1",
    "3",
    "5",
    "12"
   ],
   "correct": 1,
   "explain": "The aggregated version costs 1 search plus 1 aggregate plus 1 email, about 3 operations instead of 6."
  },
  {
   "q": "What does the map() function do?",
   "options": [
    "Converts a string into an array using a separator",
    "Joins array elements into one string",
    "Plucks one key from every element of an array of objects",
    "Returns the number of elements in an array"
   ],
   "correct": 2,
   "explain": "map() extracts a single field from every element of an array of objects, like pulling one column."
  }
 ],
 "3": [
  {
   "q": "What does a Make router do with an incoming bundle when its routes have no filters?",
   "options": [
    "It copies every bundle down every route, in order from top to bottom",
    "It sends each bundle down exactly one route chosen automatically",
    "It splits the bundles evenly across the routes",
    "It stops the run and asks for a default route"
   ],
   "correct": 0,
   "explain": "A router duplicates bundles down all routes; only per-route filters make it behave like a switch."
  },
  {
   "q": "Which bundles does a route marked as the fallback route receive?",
   "options": [
    "Every bundle, always",
    "Only the first bundle of each run",
    "Bundles that matched at least one other route",
    "Only bundles that matched no other route"
   ],
   "correct": 3,
   "explain": "The fallback route is the safety net that catches bundles no other route's filter accepted."
  },
  {
   "q": "A filter comparing scores worked until values hit double digits, when \"10\" started failing a greater-than-9 check. Why?",
   "options": [
    "Filters cannot compare numbers larger than 9",
    "A text operator was used, and strings compare character by character so \"10\" sorts before \"9\"",
    "The sheet stopped sending the score field",
    "Numeric operators round values down"
   ],
   "correct": 1,
   "explain": "Text operators never cast to numbers, so \"10\" is alphabetically less than \"9\"; the fix is choosing a numeric operator."
  },
  {
   "q": "Which error-handler directive stores the failed bundle as an incomplete execution and retries it automatically, making it the right call for transient failures like rate limits?",
   "options": [
    "Ignore",
    "Rollback",
    "Break",
    "Commit"
   ],
   "correct": 2,
   "explain": "Break parks the failed bundle in incomplete executions and retries on an interval, ideal for transient errors."
  },
  {
   "q": "What does the Resume directive do when a module fails?",
   "options": [
    "Supplies substitute output for the failed module so downstream modules continue as if it worked",
    "Drops the failed bundle silently and continues",
    "Stops the run and reverts transaction-capable modules",
    "Stops the run but keeps all completed work"
   ],
   "correct": 0,
   "explain": "Resume lets you define fallback output values, so the rest of the flow runs with safe defaults."
  }
 ],
 "4": [
  {
   "q": "How does a new Custom webhook learn which fields to offer as mapping chips?",
   "options": [
    "You type the field list into the webhook settings manually",
    "You send it one sample request while the scenario is listening, and it determines the data structure",
    "It reads the columns of the connected spreadsheet",
    "It copies the structure from the most recent scenario run"
   ],
   "correct": 1,
   "explain": "Sending one sample payload while Run once is listening lets the webhook determine its data structure."
  },
  {
   "q": "What happens to requests sent to a webhook while its scenario is switched OFF?",
   "options": [
    "They are rejected with an error status",
    "They are silently discarded",
    "They are forwarded to your email",
    "They wait in the webhook's queue and process when the scenario turns on or runs once"
   ],
   "correct": 3,
   "explain": "Webhook requests are not lost while the scenario is off; they queue and are consumed on the next run."
  },
  {
   "q": "For a Telegram bot, which comparison of the bot token and chat ID is correct?",
   "options": [
    "The token is like a password to protect, while the chat ID is just an address and harmless alone",
    "Both are public and safe to screenshot",
    "The chat ID is the secret, the token is public",
    "Both must be regenerated after every message"
   ],
   "correct": 0,
   "explain": "The token grants control of the bot and should be rotated if leaked, while the chat ID alone is harmless."
  },
  {
   "q": "Why does the lead intake build alert a human about broken submissions instead of silently dropping them?",
   "options": [
    "Make requires every route to end in a notification",
    "Dropped bundles cost extra operations",
    "A bad submission may be a real customer who typo'd, and the alert lets a human rescue them",
    "Telegram messages are needed to keep the webhook alive"
   ],
   "correct": 2,
   "explain": "Silently dropping invalid payloads loses real customers who made a typo, so the fallback route alerts the owner."
  },
  {
   "q": "What does ifempty(source; unknown) do in a mapping?",
   "options": [
    "Deletes the source field if it is empty",
    "Outputs the value unknown whenever the source field is empty",
    "Throws an error when source is empty",
    "Checks whether the word unknown appears in source"
   ],
   "correct": 1,
   "explain": "ifempty() supplies a default value when the mapped field arrives empty."
  }
 ],
 "5": [
  {
   "q": "An API responds with status code 429. What does that mean and what is the polite fix?",
   "options": [
    "The URL is wrong; fix the path",
    "Authentication failed; rotate the key",
    "You are sending requests too fast; slow down, often waiting the Retry-After header's duration",
    "The server crashed; nothing you can do"
   ],
   "correct": 2,
   "explain": "429 is a rate limit telling you to slow down, and the response often includes a Retry-After header."
  },
  {
   "q": "By default the HTTP module receives a 404 response without erroring. What setting makes failed status codes throw so error handlers can catch them?",
   "options": [
    "Evaluate all states as errors",
    "Parse response",
    "Allow storing of incomplete executions",
    "Automatically complete execution"
   ],
   "correct": 0,
   "explain": "Ticking Evaluate all states as errors makes non-success responses throw instead of sailing silently downstream."
  },
  {
   "q": "For a token-based API, what is the standard Authorization header shape?",
   "options": [
    "Name X-Token, value the raw key with quotes",
    "Name Auth, value Basic plus the key",
    "Name Token, value the key reversed",
    "Name Authorization, value Bearer followed by the token"
   ],
   "correct": 3,
   "explain": "OAuth-style and LLM APIs expect a header named Authorization with the value Bearer YOUR-TOKEN."
  },
  {
   "q": "A Repeater is set with Initial value 0, Repeats 3, Step 20, and its i chip is mapped into an offset parameter. Which offsets get called?",
   "options": [
    "0, 1, 2",
    "0, 20, 40",
    "20, 40, 60",
    "1, 21, 41"
   ],
   "correct": 1,
   "explain": "The Repeater counts from the initial value in steps, producing offsets 0, 20, and 40 across three calls."
  },
  {
   "q": "When should you drop from a dedicated app module to the raw HTTP module?",
   "options": [
    "Always, because HTTP is cheaper per operation",
    "Never, since app modules cover every endpoint",
    "When no app module exists, the app module lacks the endpoint, or you need raw control",
    "Only when the API has no authentication"
   ],
   "correct": 2,
   "explain": "Prefer the dedicated app module (auth and fields handled) and use HTTP when there is no app, a missing endpoint, or you need raw control."
  }
 ],
 "6": [
  {
   "q": "How does an AI module call get billed?",
   "options": [
    "Twice: one Make operation for the module plus token charges on the AI provider account",
    "Once, as a single Make operation covering everything",
    "Only in provider tokens, with no Make operation",
    "Per character of the prompt, in Make operations"
   ],
   "correct": 0,
   "explain": "AI modules cost one Make operation like any module while the provider bills the tokens separately, two meters."
  },
  {
   "q": "Why does the scorer put a filter checking that Score does not exist before the AI call?",
   "options": [
    "The AI refuses rows that already contain a score",
    "Sheets cannot update rows that have scores",
    "Filters are required before every AI module",
    "So a re-run never re-scores rows, which would re-bill both operations and tokens"
   ],
   "correct": 3,
   "explain": "The already-scored filter prevents accidental re-processing from re-billing every row in operations and tokens."
  },
  {
   "q": "Why set Temperature to 0.2 for a lead-scoring prompt?",
   "options": [
    "Lower temperature reduces the token bill to zero",
    "Scoring wants consistent, repeatable output rather than creativity",
    "It makes the model reply faster",
    "Values above 0.5 are rejected by the module"
   ],
   "correct": 1,
   "explain": "Low temperature favors consistency, which is what a scoring task needs; creativity would add noise."
  },
  {
   "q": "The Parse JSON module has an error handler ending in Resume with score 0 and a fallback summary. What does this achieve when the model returns unparseable text?",
   "options": [
    "The run stops and rolls back the sheet row",
    "The bad reply is retried until it parses",
    "The run continues with default values, the row still gets written, and a human is alerted",
    "The lead is deleted from the sheet"
   ],
   "correct": 2,
   "explain": "Resume substitutes safe defaults so a rambling model never kills the run, while the alert tells a human to review."
  },
  {
   "q": "Why is the standard branch built as a fallback route instead of a filter for score less than 7?",
   "options": [
    "A parse-failure score of 0 or a text answer like seven still lands safely instead of vanishing",
    "Fallback routes cost fewer operations than filters",
    "Numeric filters cannot compare against 7",
    "Routers require at least one fallback route"
   ],
   "correct": 0,
   "explain": "The fallback catches anything that fails the hot filter, including weird values, so no lead disappears."
  }
 ],
 "7": [
  {
   "q": "According to the data-placement rule, what belongs in a Make data store?",
   "options": [
    "Anything a client will read weekly",
    "Files and images too big for a spreadsheet",
    "Machine bookkeeping no human needs to read, like dedupe ledgers and ID mappings",
    "Values needed only for the current run"
   ],
   "correct": 2,
   "explain": "Sheets hold human-visible data, data stores hold machine bookkeeping, and variables hold single-run values."
  },
  {
   "q": "Which data store module behaves as an upsert, creating or overwriting a record?",
   "options": [
    "Update a record",
    "Add/replace a record with Overwrite an existing record ON",
    "Get a record",
    "Search records"
   ],
   "correct": 1,
   "explain": "Add/replace with the overwrite option on creates or overwrites by key, while Update requires the record to exist."
  },
  {
   "q": "Why does the dedupe pattern use Search records with the continue-if-none toggle instead of Get a record?",
   "options": [
    "Get costs two operations while Search costs one",
    "Search returns records faster",
    "Get cannot use lowercased keys",
    "Get is for keys you already know exist, while Search with continue-on-empty lets the route survive a missing key"
   ],
   "correct": 3,
   "explain": "Search with the continue toggle passes an empty-handed bundle onward when the key is new, which the filter then detects."
  },
  {
   "q": "What happens when the Text parser's Match pattern module runs with Global match ON and finds three matches?",
   "options": [
    "It outputs three bundles, one per match, behaving like an iterator",
    "It outputs one bundle with all matches joined by commas",
    "It outputs only the first match",
    "It throws an error because multiple matches are ambiguous"
   ],
   "correct": 0,
   "explain": "Global match emits one bundle per match, so downstream modules run once per match like after an iterator."
  },
  {
   "q": "Why is lower(email) used as the data store key for lead records?",
   "options": [
    "Data store keys must be lowercase or they are rejected",
    "One canonical key per real-world entity makes lookups and dedupes reliable, treating Dana@x.com and dana@x.com as the same contact",
    "Lowercasing shortens the key to save storage",
    "The email field cannot be mapped without a function"
   ],
   "correct": 1,
   "explain": "Normalizing the key means the same person always maps to the same record regardless of capitalization."
  }
 ],
 "8": [
  {
   "q": "What makes a naive two-way sync loop forever?",
   "options": [
    "Both systems share one API key",
    "The data store fills up and restarts the scenario",
    "Each side's write triggers the other side's watch, which writes back and re-triggers the first side endlessly",
    "Webhooks queue requests while scenarios are off"
   ],
   "correct": 2,
   "explain": "A change in system A writes to B, B's trigger fires and writes back to A, and the ping-pong never ends."
  },
  {
   "q": "Which two guards does the sync build use to prevent the infinite loop?",
   "options": [
    "An identity ledger mapping each contact to its record ID, plus a change hash of the last-synced values",
    "A Sleep module and a rate-limit filter",
    "Two fallback routes and an Ignore directive",
    "Separate connections for each direction"
   ],
   "correct": 0,
   "explain": "The ledger prevents duplicates by mapping IDs, and the stored hash lets echoes be recognized and dropped."
  },
  {
   "q": "Why must both sync directions compute the hash with the exact same field order and separator?",
   "options": [
    "Make rejects scenarios whose hashes differ",
    "md5 only works on identically named variables",
    "Different recipes produce shorter hashes that collide",
    "If the recipes differ, every echo looks like a real change and the loop comes back"
   ],
   "correct": 3,
   "explain": "The loop-kill relies on an echo hashing identical to what the other side stored, which requires identical recipes."
  },
  {
   "q": "Why was the Sheets Watch Rows trigger replaced with a scheduled Search Rows in the sync build?",
   "options": [
    "Watch Rows costs more operations per poll",
    "Watch Rows only sees new rows and never detects edits",
    "Search Rows can run without a connection",
    "Watch Rows cannot start from existing rows"
   ],
   "correct": 1,
   "explain": "Watch Rows never fires on edits, so polling all rows with a hash guard is the standard workaround."
  },
  {
   "q": "After the guards are in place, what does an echo coming back from the other system cost?",
   "options": [
    "Nothing, because it never enters the scenario",
    "The full write chain runs a second time",
    "About 3 operations before dying at the router with zero writes",
    "One incomplete execution stored for retry"
   ],
   "correct": 2,
   "explain": "The echo is looked up, hashed, matches the stored hash, and dies at the router after roughly 3 cheap operations."
  }
 ],
 "9": [
  {
   "q": "An API you call returns rate limits and occasional timeouts. Per the decision tree, which directive belongs on that module's error handler?",
   "options": [
    "Ignore, so the bundle is dropped",
    "Break with automatic retries",
    "Commit, to keep completed work",
    "Rollback, to revert everything"
   ],
   "correct": 1,
   "explain": "Transient failures like rate limits and timeouts usually fix themselves, so Break parks and retries them."
  },
  {
   "q": "What must be enabled before a Break directive can actually store failed runs?",
   "options": [
    "Allow storing of incomplete executions, in scenario settings",
    "Sequential processing mode",
    "The scenario's ON switch",
    "Data structure validation on the trigger"
   ],
   "correct": 0,
   "explain": "Without incomplete-executions storage turned on, Break has nowhere to park the failed run."
  },
  {
   "q": "What is the standard watchdog error route installed on every portfolio scenario?",
   "options": [
    "Retry three times then deactivate the scenario",
    "Rollback, then email the client",
    "Send the bundle to a second webhook for reprocessing",
    "Log one row to a central Errors sheet, send a Telegram alert, then end with Ignore or Break"
   ],
   "correct": 3,
   "explain": "The repeatable pattern is log-then-alert-then-directive, using Ignore for data problems and Break for transient API problems."
  },
  {
   "q": "In the Resume drill against an endpoint returning 500, what did downstream modules receive?",
   "options": [
    "Nothing, because the run stopped",
    "The raw 500 error page",
    "The substitute output defined in the Resume handler, such as a fallback status and body",
    "A retried successful response"
   ],
   "correct": 2,
   "explain": "Resume supplies your defined fallback output so the 500 never derails the rest of the run."
  },
  {
   "q": "Why does the 18:00 digest filter the Errors sheet by today's date instead of marking rows as reported?",
   "options": [
    "It avoids any write-back operations, keeping the digest cheap by design",
    "Sheets rows cannot be updated by a scheduled scenario",
    "Date filters are the only filters Search Rows supports",
    "Marked rows would break the Telegram formatting"
   ],
   "correct": 0,
   "explain": "Filtering by date needs zero extra update operations, so no reported flag has to be written."
  }
 ],
 "10": [
  {
   "q": "What does the formula sum(map(array; \"Revenue\"; \"Status\"; \"paid\")) compute?",
   "options": [
    "The number of paid orders",
    "The total of Revenue values from items whose Status is paid",
    "The average revenue across all rows",
    "The revenue of the first paid item only"
   ],
   "correct": 1,
   "explain": "map() with a filter pair extracts Revenue only where Status equals paid, and sum() totals those values."
  },
  {
   "q": "What is the standard group-by recipe used for the per-product breakdown?",
   "options": [
    "Router with one route per product",
    "Search Rows once per product with a filter",
    "Repeater over product count with Sleep between",
    "deduplicate() the product list, Iterator over it, then a Text Aggregator building one line per product"
   ],
   "correct": 3,
   "explain": "deduplicate then iterate then aggregate is Make's standard way to produce grouped output lines."
  },
  {
   "q": "Why does the report layout live in a Google Docs template rather than being assembled inside the scenario?",
   "options": [
    "Docs templates cost fewer operations per tag",
    "Make cannot generate multi-line text",
    "The client can restyle the report without touching the scenario, and you preview layout without burning operations",
    "Templates are required for PDF conversion"
   ],
   "correct": 2,
   "explain": "Separating layout (client-editable) from logic keeps the automation low-maintenance."
  },
  {
   "q": "A placeholder in the template was typed as {{ reportDate }} with spaces inside the braces. What happens at merge time?",
   "options": [
    "It is treated as a different tag and never gets replaced",
    "Make trims the spaces and replaces it normally",
    "The merge fails with an error",
    "The whole paragraph is deleted"
   ],
   "correct": 0,
   "explain": "Tags are replaced verbatim, so a stray space makes it a different, unmatched tag."
  },
  {
   "q": "Why must the Revenue column contain plain numbers with no currency symbols?",
   "options": [
    "Sheets refuses to store symbols in numeric columns",
    "A value like $1,240.00 is a string, and summing strings breaks the totals",
    "Make strips symbols and loses the decimals",
    "The PDF converter rejects currency characters"
   ],
   "correct": 1,
   "explain": "Formatting belongs in the report; formatted cells are strings and sum() on strings is a bug waiting to happen."
  }
 ],
 "11": [
  {
   "q": "Order line items arrive as an array but the invoice template wants one text block. What is the recipe?",
   "options": [
    "Parse JSON, then a Router per item",
    "map() the array straight into the template",
    "Iterator to explode the array, then a Text Aggregator to fold the items into formatted lines",
    "A Repeater set to the item count"
   ],
   "correct": 2,
   "explain": "Iterator then Text Aggregator is the standard pattern for turning an array into a formatted multi-line block."
  },
  {
   "q": "Why is the fulfillment Add a Row placed before the VIP/standard router?",
   "options": [
    "Shared work goes before the split so the row exists exactly once no matter which route fires",
    "Routers cannot be followed by Sheets modules",
    "Rows added after a router are marked as drafts",
    "It saves one operation per route"
   ],
   "correct": 0,
   "explain": "Work common to all outcomes belongs before the router; routes should only hold what differs."
  },
  {
   "q": "The VIP filter checks total greater than or equal to 100. Why must it use the numeric operator family?",
   "options": [
    "Text operators cannot read mapped chips",
    "Numeric operators run faster",
    "The filter panel defaults to date operators",
    "Text comparison thinks 99 is greater than 100 because 9 sorts after 1"
   ],
   "correct": 3,
   "explain": "Choosing text operators compares character by character, so \"99\" beats \"100\" and VIPs get the wrong email."
  },
  {
   "q": "A refund request arrives for an order ID that is not in the Orders sheet. What does the build do?",
   "options": [
    "Creates a new order row with status refunded",
    "Sends only an ops alert about the unknown order, with no customer email since you do not know who they are",
    "Emails every customer in the sheet",
    "Rolls back the whole scenario run"
   ],
   "correct": 1,
   "explain": "Handling the record-not-found case with an alert and no blind email is what separates a demo from an ops flow."
  },
  {
   "q": "After a Text Aggregator collapses the item bundles, can the Docs module still map fields from the earlier webhook module?",
   "options": [
    "No, aggregators erase all earlier chips",
    "Only if the webhook is re-run first",
    "Yes, chips from modules before the aggregation are still reachable",
    "Only fields that were included in the aggregation"
   ],
   "correct": 2,
   "explain": "After an aggregator you can still reach earlier modules' chips, which is how the invoice fills order and customer fields."
  }
 ],
 "12": [
  {
   "q": "Why does the approval flow store the full draft in a data store and put only an ID in the Telegram links?",
   "options": [
    "A link click cannot carry the whole draft, so state lives in the store and the message carries only pointers",
    "Telegram deletes messages containing long text",
    "Data stores are free while messages cost operations",
    "Webhooks reject payloads with more than one field"
   ],
   "correct": 0,
   "explain": "State in the store, pointers in the message: the link only needs the ID and the decision."
  },
  {
   "q": "How are the tappable Approve and Reject buttons actually implemented?",
   "options": [
    "Native Telegram inline buttons wired to the bot API",
    "Two separate Telegram bots, one per decision",
    "Emails with reply-to parsing",
    "Plain links to a webhook URL carrying the draft ID and the decision in the query string"
   ],
   "correct": 3,
   "explain": "Each button is just a link to the approval webhook with id and decision as query parameters."
  },
  {
   "q": "What does ending each handler route with a Webhook response module accomplish?",
   "options": [
    "It re-triggers the generator scenario",
    "The person clicking sees a real confirmation page instead of a cryptic Accepted",
    "It stores the decision in the data store automatically",
    "It closes the webhook so no more clicks register"
   ],
   "correct": 1,
   "explain": "Webhook response gives the click an answer, like a 200 with a human-readable confirmation body."
  },
  {
   "q": "Why does the generator update each idea row's Status to sent after messaging the draft?",
   "options": [
    "Telegram requires a status field to deliver messages",
    "The approval handler reads that column to route decisions",
    "Without mark-as-processed, every run re-drafts the same ideas, duplicating messages and AI spend",
    "It lets the sheet trigger the approval webhook"
   ],
   "correct": 2,
   "explain": "Mark-as-processed is the polling twin of a hash guard: it stops re-processing and duplicate AI billing."
  },
  {
   "q": "You tap Approve in Telegram but nothing happens and the browser just spins. What is the most likely cause in this build?",
   "options": [
    "The draft ID contains uppercase letters",
    "The data store is over its size limit",
    "Telegram blocked the bot token",
    "The approval handler scenario is switched OFF, so nothing is listening for the click"
   ],
   "correct": 3,
   "explain": "Webhook scenarios only catch requests while they are ON or actively listening via Run once."
  }
 ],
 "13": [
  {
   "q": "What are the rules of the 30-minute rebuild drills?",
   "options": [
    "Blank scenario and official docs allowed, but your own old blueprints and notes are not",
    "Any resource allowed including old blueprints",
    "No documentation of any kind allowed",
    "Pair building with another person is required"
   ],
   "correct": 0,
   "explain": "The drills simulate interviews: docs are fair game, but your past work and day pages stay closed."
  },
  {
   "q": "In the classify drill, router filters on the AI's one-word output can fail even when the word looks right. What is the fix?",
   "options": [
    "Raise the model temperature",
    "Increase max tokens so the word completes",
    "Wrap the filter value with trim(lower(...)) because whitespace or casing breaks the match",
    "Use a fallback route for all three categories"
   ],
   "correct": 2,
   "explain": "Stray whitespace or capitalization in model output silently breaks equality filters, so normalize before comparing."
  },
  {
   "q": "What is the realistic value of the Make Academy Foundation certification in a job hunt?",
   "options": [
    "It guarantees interviews at partner agencies",
    "It replaces the need for a portfolio",
    "It unlocks higher operation quotas",
    "It will not get you hired alone, but it gets you past recruiter filters that search for it"
   ],
   "correct": 3,
   "explain": "Certification is a filter-passer and credibility signal, layered on top of the portfolio, not a substitute for it."
  },
  {
   "q": "How do you verify a blueprint library is genuinely deliverable-grade?",
   "options": [
    "Check each file opens in a text editor",
    "Import sample blueprints into blank scenarios and confirm everything arrives intact with only connections needing re-linking",
    "Compare file sizes against the originals",
    "Run a JSON linter over the folder"
   ],
   "correct": 1,
   "explain": "A re-import test proves modules, routes, and filters survive and that only connections need re-linking, the sentence you say at handover."
  },
  {
   "q": "Why screenshot the operations meter on Day 1 and again on Day 13?",
   "options": [
    "Make requires usage proof for certification",
    "The meter resets whenever a scenario is deleted",
    "Screenshots restore lost operations if disputed",
    "Real measured usage lets you quote clients an operations budget, a rare differentiator among junior applicants"
   ],
   "correct": 3,
   "explain": "Quoting an operations budget from measured data, not vibes, is the cost-discipline story clients and interviewers value."
  }
 ],
 "14": [
  {
   "q": "What is the four-part script every portfolio demo video follows?",
   "options": [
    "Intro, feature list, pricing, outro",
    "Company history, tool tour, testimonial, call to action",
    "The problem, a live demo, design choices including operations cost and error handling, and what a client gets",
    "Setup steps, blueprint walkthrough, code review, summary"
   ],
   "correct": 2,
   "explain": "Problem, live demo, design choices (always naming cost and error handling), then the client deliverables, in two to three minutes."
  },
  {
   "q": "What is the honesty rule for the portfolio case studies?",
   "options": [
    "Round all metrics up to sound confident",
    "Frame them plainly as demonstration builds with no invented clients or results",
    "Only publish case studies with real client names",
    "Omit any mention of what the build cost to run"
   ],
   "correct": 1,
   "explain": "Every case study says it is a demonstration build; fabricated results get found out in interviews."
  },
  {
   "q": "In what order should the seven builds appear in the master portfolio gallery?",
   "options": [
    "Chronologically, Day 4 first",
    "Alphabetically by scenario name",
    "Cheapest to most expensive to run",
    "By impressiveness, leading with the two-way sync"
   ],
   "correct": 3,
   "explain": "Order by impact, not chronology, so the strongest builds like the sync and approval pipeline are seen first."
  },
  {
   "q": "Why add Integromat alongside Make.com to your LinkedIn skills?",
   "options": [
    "Recruiters still search for the platform's old name",
    "Integromat is a separate advanced certification",
    "LinkedIn rejects skill names containing a dot",
    "It doubles the skill endorsement count automatically"
   ],
   "correct": 0,
   "explain": "Make was formerly Integromat and recruiters still search the old name, so listing both catches more searches."
  },
  {
   "q": "In the platform comparison table, which combination correctly describes Make?",
   "options": [
    "Per-task pricing, automatic item looping, self-hosting available",
    "Execution-based pricing, error workflows, self-hosted option",
    "Per-operation pricing, explicit iterators and aggregators, no self-hosting",
    "Flat monthly pricing, mostly linear steps, replay-based error handling"
   ],
   "correct": 2,
   "explain": "Make bills per operation, makes looping explicit via iterators and aggregators, and offers no self-hosted option."
  }
 ]
};

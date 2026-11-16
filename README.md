# CampusHire — DBIS project

CampusHire is a placement management application backed by MySQL stored procedures and triggers.

## Database setup

See [database/SETUP_AND_TESTING.md](database/SETUP_AND_TESTING.md) for the safe install order, module ownership, and manual verification checklist. Keep credentials in local environment configuration; never commit passwords, tokens, or real student data.

## Contributor modules

- **Anagh:** Department and Student schema; T1, T8, T9; student management triggers TR1–TR6.
- **Arush:** Company, Placement_Officer, Placement_Drive and Eligibility_Criteria; T2; drive/eligibility triggers.
- **Bhuvaneesh:** Application and Selection_Round workflow; T3 and T7; application triggers.
- **Jay:** Round_Result and Offer lifecycle; T4–T6 and T10 reporting; result/offer triggers.

Module boundaries describe primary ownership. Coordinate changes to shared SQL files and preserve the app's procedure names, parameter order, result columns, and status values.

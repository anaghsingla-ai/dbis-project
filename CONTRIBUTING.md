# Four-member contribution layout

The shared application/schema baseline stays common to everyone. Each person owns one module directory so SQL changes are isolated and PRs are easy to review. Do not split or duplicate the entire project into four copies.

| Owner | Module directory | Schema ownership | Procedures | Triggers |
|---|---|---|---|---|
| Anagh | `database/modules/anagh/` | Department, Student | T1 `sp_register_student`, T8 `sp_update_academic_record`, T9 `sp_transfer_student_dept` | TR1–TR6 |
| Arush | `database/modules/arush/` | Placement_Officer, Company, Placement_Drive, Eligibility_Criteria | T2 `sp_create_drive` | TR7–TR10 |
| Bhuvaneesh | `database/modules/bhuvaneesh/` | Application, Selection_Round | T3 `sp_apply_to_drive`, T7 `sp_withdraw_application` | TR11–TR13 |
| Jay | `database/modules/jay/` | Round_Result, Offer | T4 `sp_record_round_result`, T5 `sp_issue_offer`, T6 `sp_respond_to_offer`, T10 `sp_placement_report` | TR14–TR20 |

Each module should contain three focused SQL files: one for its table definitions, one for its procedures, and one for its triggers. Anagh's committed filenames are the naming example. Teammates should keep all their work under their assigned module directory. Do not edit another owner's module without coordinating first.

The module schema files are contribution slices, not standalone full application schemas. Install the full shared schema and support tables before testing all modules. Preserve procedure names, parameter order/types, result columns, enums, foreign keys, and behavior used by the CampusHire app. Coordinate changes where modules interact, especially Anagh's T8 eligibility updates, Bhuvaneesh's application state, and Jay's round/offer rules.

## Fork and pull request steps

1. Open https://github.com/anaghsingla-ai/dbis-project and click **Fork** to create a copy under your own GitHub account.
2. Clone your fork and create a branch from its `main` branch:
   `git clone https://github.com/YOUR-USERNAME/dbis-project.git`
   `cd dbis-project`
   `git switch -c YOUR-NAME/your-module`
3. Add or edit only your files under your assigned `database/modules/<owner>/` folder. Add focused SQL tests or test notes for your module.
4. Check `git status` and inspect the diff. Never add `.env`, database data directories, private keys/certificates, logs, caches, virtual environments, or build output.
5. Commit under your own GitHub account, then push your branch to your fork:
   `git add database/modules/<owner> tests`
   `git commit -m "Implement <module> database work"`
   `git push -u origin YOUR-NAME/your-module`
6. On GitHub, open a pull request with the **base repository** `anaghsingla-ai/dbis-project`, base branch `main`, and your fork branch as the head. Describe changes and the tests actually run. The repository owner reviews and merges the PR.

Do not claim another member's work, fabricate commits, or report tests that were not run. When conflicts arise, sync from upstream `main` and ask the owners of the affected modules before resolving cross-module SQL changes.

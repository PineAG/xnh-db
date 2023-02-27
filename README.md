## TODOs
* Edit experience optimization
  * Tmp edit context
  * remove async operations from relation editor: make payload a binding
  * Batch DB update actions?
  * Create Entity Dialog
* Async loading optimization
  * File provider to unify view mode and edit mode
  * Octokit auto retry
  * Optimize search result loading (currently load everything immediately)
* UI Issue
  * Rich text support? (Markdown)
  * Avatar image is not centralized
  * Entity page flex layout
  * Gallery editor: + Move
  * Form item boundary inside entity layout
  * Sync bug
  * /data pipeline not working
  * Select Parent (patch "exclude" query)

### Mitigated issues
* Fix routing issue (broken when character/yyy => artwork/xxx)
  * Page view needs one more tick to update injections.
* Collect file changes
  * Only for collections, not for payloads
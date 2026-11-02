# Review it as the maintainer will

The detail of Gate 11 of the ship audit.

**Scope.** The whole branch against the current tip of its base, not the
last commit. A branch that grew over several review rounds carries text
written for an earlier round.

**Every earlier review point.** List each point from each review on the
pull request and mark it done (with the commit), deliberately not done
(with the reason) or open. A point answered in code and not in a reply is
invisible to the person who raised it.

**Documentation against the code.** Read every Markdown file the branch
adds or changes and check each claim against the code as it is now:
counts of tests and files, the state of other pull requests and issues,
anything the branch has since removed, and behaviour claims verified in
the code that implements them.

**Issues the pull request closes.** Go through each issue's success
criteria and mark each one met, met differently (name the difference) or
open.

**The pull request description.** Every number and every "none" in it
holds on the current head.

**The maintainer's own tools.** Read the reviews already posted, which
cost nothing. Do not trigger a maintainer's review agent on the pull
request to get a review, because it runs on their account.

**Say what has not been run.** An end-to-end suite that needs a live
installation, a browser check nobody performed, a screenshot older than
the change. Naming the gap costs a sentence.

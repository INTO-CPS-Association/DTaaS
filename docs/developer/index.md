# A Developer's Guide

This guide is to help developers get familiar with the project. Please see
developer-specific
[Slides](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/DTaaS-overview.pdf),
[Video](https://odin.cps.digit.au.dk/into-cps/dtaas/assets/videos/DTaaS-overview.mkv),
and [Research paper](https://arxiv.org/abs/2305.07244).

## Operating Softwares

Ideally, developers should work on Ubuntu/Linux. Other operating systems are not supported inherently and may require additional steps.

## Code Editing

Any popular code editors can be used to work on the project. VS Code, Sublime Text are a few examples.

## Development Workflow

To manage collaboration by multiple developers on the software, a simple [Fork, Branch, PR](https://gun.io/news/2017/01/how-to-github-fork-branch-and-pull-request/) development workflow is in place. Each developer should follow these steps:

1. Have an updated fork of the main repository on their account. This should also be added to codeclimate. 
1. Clone your personal fork onto your computer.
    ```
    git clone https://github.com/<yourgithubusername>/DTaaS.git
    ```
1. Work on your issue/feature on your personal computer. 

1. Any updates/additions to the software should first be committed to your personal fork.
    
    1. To check status of your changes:
        ```
        git status
        ```
    2. Add the changes to the commit:
        ```
        git add --all *
        ```
    3. Finally, commit these to the repository on your PC.
        ```
        git commit -m <commit message>
        ```
1. Push any commits onto your fork of the repository
    ```
    git push
    ```

1. Any issues that arise codeclimate should also be resolved.

1. Once changes are made, they should be tested on personal systems or the [integration server](https://github.com/INTO-CPS-Association/DTaaS/wiki/DTaaS-Integration-Server) .

1. Once changes are verified, a PR should be made to the appropriate branch of the main repository.
1. Any issues raised in the PR review should be resolved.
1. Finally, the PR will be merged.

Remember that every commit should be meaningful and satisfies the requirements.

## Code Quality

Quality checks are performed by CodeClimate to ensure the best possible quality of code to add to our project.

While any new issues introduced in your code would be shown in the PR page itself, to address any specific issue, you can visit the Issues or Code section of the CodeClimate page.

It is highly recommended that any code you add does not introduce new quality issues. If they are introduced, they should be fixed immediately using the appropriate suggestions from CodeClimate, or in worst case, adding a ignore flag (To be used with caution).

## Testing

For information about testing and workflow related to that, please see the [testing page](testing/intro.md).

## Live Demo Server

A demo server is up and running at [https://sandbox.cps.digit.au.dk/](https://sandbox.cps.digit.au.dk/). Developers will need credentials to log in.

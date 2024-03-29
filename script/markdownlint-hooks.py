import subprocess
import sys

def markdownlint_hooks(files):
    command = ["mdl-check.py"] + files
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output = result.stdout.decode("utf-8") + result.stderr.decode("utf-8")
    print(output)

if __name__ == "__main__":
    files = sys.argv[1:]
    markdownlint_hooks(files)
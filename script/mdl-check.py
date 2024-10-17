import subprocess
import sys

def mdl_check(files):
    command = ["mdl"] + files
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output = result.stdout.decode("utf-8") + result.stderr.decode("utf-8")
    print(output)

if __name__ == "__main__":
    files = sys.argv[1:]
    mdl_check(files)
import hashlib
import os
import posixpath
import stat
import sys
from typing import Tuple

import paramiko

HOST = "166.88.141.54"
PORT = 22
USERNAME = "root"
PASSWORD = "N2w2E8G5U1E3bcA6f1A4"
LOCAL_ROOT = "/home/ubuntu/bscs2/dist"
REMOTE_ROOT = "/www/wwwroot/bdcs2-app/dist"
RESTART_COMMAND = "cd /www/wwwroot/bdcs2-app && pm2 restart all && pm2 status"

SINGLE_FILE_TARGETS = [
    ("index.js", "index.js"),
    ("public/index.html", "public/index.html"),
]
TREE_TARGETS = [
    ("public/assets", "public/assets"),
    ("public/audio", "public/audio"),
]


def print_flush(message: str) -> None:
    print(message)
    sys.stdout.flush()


def connect_ssh() -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=30)
    return client


def run_remote(client: paramiko.SSHClient, command: str) -> None:
    print_flush(f"$ {command}")
    stdin, stdout, stderr = client.exec_command(command)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="ignore")
    err = stderr.read().decode("utf-8", errors="ignore")
    if out.strip():
        print(out, end="" if out.endswith("\n") else "\n")
    if err.strip():
        print(err, end="" if err.endswith("\n") else "\n")
    if exit_code != 0:
        raise RuntimeError(f"Remote command failed ({exit_code}): {command}")


def ensure_remote_dir(sftp: paramiko.SFTPClient, remote_dir: str) -> None:
    remote_dir = remote_dir.rstrip("/")
    parts = remote_dir.split("/")
    current = ""
    for part in parts:
        if not part:
            current = "/"
            continue
        current = posixpath.join(current, part) if current != "/" else f"/{part}"
        try:
            attrs = sftp.stat(current)
            if not stat.S_ISDIR(attrs.st_mode):
                raise RuntimeError(f"Remote path exists but is not a directory: {current}")
        except FileNotFoundError:
            sftp.mkdir(current)


def file_md5(path: str) -> str:
    md5 = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            md5.update(chunk)
    return md5.hexdigest()


def remote_file_md5(sftp: paramiko.SFTPClient, remote_path: str) -> str:
    md5 = hashlib.md5()
    with sftp.open(remote_path, "rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            md5.update(chunk)
    return md5.hexdigest()


def files_match(sftp: paramiko.SFTPClient, local_path: str, remote_path: str) -> bool:
    try:
        remote_stat = sftp.stat(remote_path)
    except FileNotFoundError:
        return False
    local_stat = os.stat(local_path)
    if local_stat.st_size != remote_stat.st_size:
        return False
    return file_md5(local_path) == remote_file_md5(sftp, remote_path)


def upload_file(sftp: paramiko.SFTPClient, local_path: str, remote_path: str) -> Tuple[bool, str]:
    ensure_remote_dir(sftp, posixpath.dirname(remote_path))
    if files_match(sftp, local_path, remote_path):
        return False, remote_path
    sftp.put(local_path, remote_path)
    return True, remote_path


def upload_tree(sftp: paramiko.SFTPClient, local_rel_root: str, remote_rel_root: str) -> Tuple[int, int]:
    local_root = os.path.join(LOCAL_ROOT, local_rel_root)
    remote_root = posixpath.join(REMOTE_ROOT, remote_rel_root)
    ensure_remote_dir(sftp, remote_root)

    uploaded = 0
    skipped = 0
    for current_root, dirs, files in os.walk(local_root):
        dirs.sort()
        files.sort()
        rel_root = os.path.relpath(current_root, local_root)
        remote_current = remote_root if rel_root == "." else posixpath.join(remote_root, rel_root.replace(os.sep, "/"))
        ensure_remote_dir(sftp, remote_current)
        for filename in files:
            local_path = os.path.join(current_root, filename)
            remote_path = posixpath.join(remote_current, filename)
            changed, final_remote_path = upload_file(sftp, local_path, remote_path)
            if changed:
                uploaded += 1
                print_flush(f"Uploaded: {final_remote_path}")
            else:
                skipped += 1
                print_flush(f"Skipped:  {final_remote_path}")
    return uploaded, skipped


def main() -> None:
    print_flush("[1/4] Connect to server...")
    client = connect_ssh()
    try:
        print_flush("[2/4] Ensure remote directories exist...")
        run_remote(client, f"mkdir -p {REMOTE_ROOT}/public/assets {REMOTE_ROOT}/public/audio")

        uploaded = 0
        skipped = 0
        print_flush("[3/4] Incrementally upload code bundles and current hashed assets...")
        with client.open_sftp() as sftp:
            for local_rel, remote_rel in SINGLE_FILE_TARGETS:
                local_path = os.path.join(LOCAL_ROOT, local_rel)
                remote_path = posixpath.join(REMOTE_ROOT, remote_rel)
                changed, final_remote_path = upload_file(sftp, local_path, remote_path)
                if changed:
                    uploaded += 1
                    print_flush(f"Uploaded: {final_remote_path}")
                else:
                    skipped += 1
                    print_flush(f"Skipped:  {final_remote_path}")

            for local_rel, remote_rel in TREE_TARGETS:
                tree_uploaded, tree_skipped = upload_tree(sftp, local_rel, remote_rel)
                uploaded += tree_uploaded
                skipped += tree_skipped

        print_flush(f"Upload summary: uploaded={uploaded}, skipped={skipped}")
        print_flush("[4/4] Restart service...")
        run_remote(client, RESTART_COMMAND)
        print_flush("Incremental deployment finished successfully.")
    finally:
        client.close()


if __name__ == "__main__":
    main()

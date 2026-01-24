import requests
import time

MIRRORS = [
    "https://api.themoviedb.org/3/configuration",
    "https://imagetmdb.com/t/p/w92/kqjL17yufvn9OVLyXYpvtyrFfak.jpg",
    "https://nl.imagetmdb.com/t/p/w92/kqjL17yufvn9OVLyXYpvtyrFfak.jpg",
    "https://apn-latest.onrender.com/3/configuration"
]

def check_mirror(url):
    try:
        start = time.time()
        res = requests.get(url, timeout=5)
        duration = (time.time() - start) * 1000
        status = res.status_code
        print(f"[{status}] {duration:.0f}ms - {url}")
        return status == 200
    except Exception as e:
        print(f"[FAIL] {url} - {str(e)}")
        return False

if __name__ == "__main__":
    print("Testing Resilience Layer...")
    for mirror in MIRRORS:
        check_mirror(mirror)

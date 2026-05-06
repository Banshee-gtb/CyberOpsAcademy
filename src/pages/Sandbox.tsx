import { useState, useCallback } from 'react';
import { Code2, Terminal, BookOpen, Zap, ChevronDown, Shield, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import CodeEditor from '@/components/features/CodeEditor';
import CyberTerminal from '@/components/features/CyberTerminal';

const SANDBOX_TEMPLATES = [
  {
    id: 'password_checker',
    name: 'Password Strength Checker',
    icon: '🔒',
    language: 'python',
    description: 'Write a function to evaluate password strength based on length, complexity, and common patterns.',
    code: `import re

def check_password_strength(password: str) -> dict:
    """
    Analyze password strength and return a detailed report.
    
    Returns:
        dict with keys: strength, score, feedback, criteria
    """
    criteria = {
        "length_ok": len(password) >= 12,
        "has_upper": bool(re.search(r"[A-Z]", password)),
        "has_lower": bool(re.search(r"[a-z]", password)),
        "has_digit": bool(re.search(r"\\d", password)),
        "has_special": bool(re.search(r"[!@#$%^&*(),.?\\\":{}|<>]", password)),
    }
    
    score = sum(criteria.values())
    
    if score <= 2:
        strength = "weak"
    elif score <= 3:
        strength = "medium"
    elif score <= 4:
        strength = "strong"
    else:
        strength = "very_strong"
    
    return {
        "strength": strength,
        "score": score,
        "criteria": criteria,
    }

# Test it
print(check_password_strength("hello"))
print(check_password_strength("MyP@ssw0rd!2024"))`,
    testCases: [
      { input: '"hello"', expected: 'weak', description: 'Short lowercase-only password should be weak' },
      { input: '"MyP@ssw0rd!2024"', expected: 'very_strong', description: 'Complex long password should be very strong' },
      { input: '"Password1"', expected: 'medium to strong', description: 'Common pattern with some complexity' },
    ],
  },
  {
    id: 'url_analyzer',
    name: 'Phishing URL Detector',
    icon: '🎣',
    language: 'python',
    description: 'Build a function that analyzes URLs for phishing indicators like lookalike domains and suspicious patterns.',
    code: `import re

def analyze_url(url: str) -> dict:
    """
    Analyze a URL for phishing indicators.
    
    Returns:
        dict with: is_suspicious, risk_score, indicators
    """
    indicators = []
    risk_score = 0
    
    # Check for IP address instead of domain
    if re.search(r"https?://\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}", url):
        indicators.append("Uses IP address instead of domain name")
        risk_score += 30
    
    # Check for lookalike characters
    lookalikes = {"0": "o", "1": "l", "5": "s"}
    domain = url.split("//")[-1].split("/")[0].lower()
    for char, replacement in lookalikes.items():
        if char in domain:
            indicators.append(f"Possible lookalike: '{char}' may substitute '{replacement}'")
            risk_score += 20
    
    # Check for suspicious TLDs
    suspicious_tlds = [".tk", ".ml", ".xyz", ".top", ".buzz"]
    for tld in suspicious_tlds:
        if domain.endswith(tld):
            indicators.append(f"Suspicious TLD: {tld}")
            risk_score += 15
    
    # Check for excessive subdomains
    subdomain_count = domain.count(".")
    if subdomain_count > 3:
        indicators.append(f"Excessive subdomains ({subdomain_count} dots)")
        risk_score += 15
    
    return {
        "is_suspicious": risk_score > 25,
        "risk_score": min(risk_score, 100),
        "indicators": indicators,
    }

# Test URLs
print(analyze_url("https://www.google.com"))
print(analyze_url("https://g00gle-verify.com/login"))
print(analyze_url("http://192.168.1.100/paypal/login.php"))`,
    testCases: [
      { input: '"https://www.google.com"', expected: 'not suspicious', description: 'Legitimate Google URL should be safe' },
      { input: '"https://g00gle-verify.com/login"', expected: 'suspicious', description: 'Lookalike domain with number substitution' },
      { input: '"http://192.168.1.100/paypal/login.php"', expected: 'suspicious', description: 'IP address with misleading path' },
    ],
  },
  {
    id: 'log_analyzer',
    name: 'Security Log Analyzer',
    icon: '📊',
    language: 'python',
    description: 'Parse and analyze security logs to detect brute force attacks and suspicious activity.',
    code: `from collections import Counter

def analyze_logs(logs: list) -> dict:
    """
    Analyze security logs for suspicious patterns.
    
    Each log entry: "timestamp IP action status"
    Example: "2024-03-15T10:30:00 192.168.1.50 LOGIN FAILED"
    
    Returns: dict with attack indicators
    """
    failed_by_ip = Counter()
    success_by_ip = Counter()
    actions = Counter()
    
    for log in logs:
        parts = log.split()
        if len(parts) < 4:
            continue
        
        ip = parts[1]
        action = parts[2]
        status = parts[3]
        
        actions[action] += 1
        
        if status == "FAILED":
            failed_by_ip[ip] += 1
        elif status == "SUCCESS":
            success_by_ip[ip] += 1
    
    # Detect brute force (>5 failed attempts from same IP)
    brute_force_ips = {ip: count for ip, count in failed_by_ip.items() if count > 5}
    
    # Detect credential stuffing (many IPs with 1-2 failures)
    low_fail_ips = [ip for ip, count in failed_by_ip.items() if 1 <= count <= 2]
    credential_stuffing = len(low_fail_ips) > 10
    
    return {
        "total_events": len(logs),
        "brute_force_detected": len(brute_force_ips) > 0,
        "brute_force_ips": brute_force_ips,
        "credential_stuffing_suspected": credential_stuffing,
        "failed_logins": sum(failed_by_ip.values()),
        "successful_logins": sum(success_by_ip.values()),
    }

# Sample logs
sample_logs = [
    "2024-03-15T10:30:00 192.168.1.50 LOGIN FAILED",
    "2024-03-15T10:30:01 192.168.1.50 LOGIN FAILED",
    "2024-03-15T10:30:02 192.168.1.50 LOGIN FAILED",
    "2024-03-15T10:30:03 192.168.1.50 LOGIN FAILED",
    "2024-03-15T10:30:04 192.168.1.50 LOGIN FAILED",
    "2024-03-15T10:30:05 192.168.1.50 LOGIN FAILED",
    "2024-03-15T10:31:00 10.0.0.5 LOGIN SUCCESS",
    "2024-03-15T10:32:00 10.0.0.10 LOGIN FAILED",
]

result = analyze_logs(sample_logs)
print(result)`,
    testCases: [
      { input: 'logs with 6+ failures from one IP', expected: 'brute_force_detected: true', description: 'Should detect brute force from repeated failures' },
      { input: 'normal login logs', expected: 'brute_force_detected: false', description: 'Normal activity should not trigger alerts' },
    ],
  },
  {
    id: 'sqli_detector',
    name: 'SQL Injection Detector',
    icon: '💉',
    language: 'python',
    description: 'Build a function that detects common SQL injection patterns in user input.',
    code: `import re

def detect_sqli(user_input: str) -> dict:
    """
    Detect SQL injection patterns in user input.
    
    Returns:
        dict with: is_malicious, risk_level, threats, patterns_found
    """
    threats = []
    input_upper = user_input.upper()
    
    # Check for UNION-based injection
    if "UNION" in input_upper and "SELECT" in input_upper:
        threats.append("UNION-based injection attempt")
    
    # Check for boolean bypass
    boolean_patterns = ["OR 1=1", "OR '1'='1'", "OR TRUE", "OR 1=1--"]
    for pattern in boolean_patterns:
        if pattern in input_upper:
            threats.append(f"Boolean bypass: {pattern}")
    
    # Check for SQL comments (query termination)
    if "--" in user_input or "/*" in user_input:
        threats.append("SQL comment injection")
    
    # Check for destructive commands
    destructive = ["DROP TABLE", "DELETE FROM", "TRUNCATE", "UPDATE SET"]
    for cmd in destructive:
        if cmd in input_upper:
            threats.append(f"Destructive command: {cmd}")
    
    # Check for time-based blind injection
    time_funcs = ["SLEEP(", "WAITFOR", "BENCHMARK(", "PG_SLEEP"]
    for func in time_funcs:
        if func in input_upper:
            threats.append(f"Time-based blind injection: {func}")
    
    # Determine risk level
    risk_level = "LOW"
    if len(threats) == 1:
        risk_level = "MEDIUM"
    elif len(threats) >= 2:
        risk_level = "HIGH"
    elif len(threats) >= 3:
        risk_level = "CRITICAL"
    
    return {
        "is_malicious": len(threats) > 0,
        "risk_level": risk_level,
        "threats": threats,
        "input_length": len(user_input),
    }

# Test inputs
print(detect_sqli("admin"))  # Normal
print(detect_sqli("' OR 1=1--"))  # Injection
print(detect_sqli("'; DROP TABLE users--"))  # Destructive`,
    testCases: [
      { input: '"admin"', expected: 'not malicious', description: 'Normal username should be safe' },
      { input: '"\\' OR 1=1--"', expected: 'malicious, HIGH risk', description: 'Classic SQL injection bypass' },
      { input: '"\\'; DROP TABLE users--"', expected: 'malicious, CRITICAL risk', description: 'Destructive SQL injection' },
    ],
  },
  {
    id: 'blank',
    name: 'Blank Script',
    icon: '📝',
    language: 'python',
    description: 'Start from scratch — write any Python script you want.',
    code: `# CyberNinja Sandbox — Write your code here
# 
# Ideas:
# - Build a port scanner simulator
# - Create a Caesar cipher encoder/decoder  
# - Write a network packet parser
# - Build a hash cracker
# - Create a log file analyzer

def main():
    print("Hello, CyberNinja!")
    # Your code here...

main()`,
    testCases: [],
  },
];

// Extended terminal commands for sandbox mode
const SANDBOX_TERMINAL_COMMANDS: Record<string, { output: string; success: boolean }> = {
  'nmap 192.168.1.0/24': {
    output: `Starting Nmap 7.94 ( https://nmap.org )
Nmap scan report for 192.168.1.1 (gateway)
PORT    STATE SERVICE
22/tcp  open  ssh
80/tcp  open  http
443/tcp open  https

Nmap scan report for 192.168.1.10 (webserver)
PORT     STATE SERVICE    VERSION
22/tcp   open  ssh        OpenSSH 8.4
80/tcp   open  http       Apache 2.4.49
443/tcp  open  https      Apache 2.4.49
3306/tcp open  mysql      MySQL 5.7.38

Nmap scan report for 192.168.1.50 (workstation)
PORT    STATE SERVICE
22/tcp  open  ssh
139/tcp open  netbios-ssn
445/tcp open  microsoft-ds

Nmap done: 256 IP addresses (3 hosts up) scanned in 12.34 seconds`,
    success: false,
  },
  'nmap -sV 192.168.1.10': {
    output: `Starting Nmap 7.94 ( https://nmap.org )
Nmap scan report for 192.168.1.10
PORT     STATE SERVICE    VERSION
22/tcp   open  ssh        OpenSSH 8.4p1 Ubuntu 6ubuntu2.1
80/tcp   open  http       Apache httpd 2.4.49 ((Ubuntu))
443/tcp  open  ssl/http   Apache httpd 2.4.49 ((Ubuntu))
3306/tcp open  mysql      MySQL 5.7.38-0ubuntu0.18.04.1
8080/tcp open  http-proxy Squid 4.10

Service detection performed. 5 services scanned.
Nmap done: 1 IP address (1 host up) scanned in 8.21 seconds`,
    success: false,
  },
  'nmap -p- 192.168.1.10': {
    output: `Starting Nmap 7.94 ( https://nmap.org )
Nmap scan report for 192.168.1.10
PORT      STATE  SERVICE
22/tcp    open   ssh
80/tcp    open   http
443/tcp   open   https
3306/tcp  open   mysql
5432/tcp  closed postgresql
8080/tcp  open   http-proxy
8443/tcp  open   https-alt
9090/tcp  open   zeus-admin
27017/tcp closed mongod

Nmap done: 1 IP address (1 host up) scanned in 45.67 seconds`,
    success: false,
  },
  'whois cyberNinja-target.com': {
    output: `Domain Name: CYBERNINJA-TARGET.COM
Registry Domain ID: 2345678901_DOMAIN_COM-VRSN
Registrar: GoDaddy.com, LLC
Updated Date: 2024-01-15T08:30:00Z
Creation Date: 2022-06-20T12:00:00Z
Expiry Date: 2025-06-20T12:00:00Z

Registrant Name: CyberNinja Corp
Registrant Organization: CyberNinja Training Systems
Registrant Street: 1337 Hack Street
Registrant City: San Francisco
Registrant State/Province: CA
Registrant Postal Code: 94105
Registrant Country: US
Registrant Email: admin@cyberninja-target.com

Name Server: NS1.CLOUDFLARE.COM
Name Server: NS2.CLOUDFLARE.COM`,
    success: false,
  },
  'dig cyberNinja-target.com any': {
    output: `;; ANSWER SECTION:
cyberninja-target.com.   300  IN  A      104.21.45.67
cyberninja-target.com.   300  IN  A      172.67.89.12
cyberninja-target.com.   300  IN  AAAA   2606:4700:3030::6815:2d43
cyberninja-target.com.   300  IN  MX     10 mail.cyberninja-target.com.
cyberninja-target.com.   300  IN  NS     ns1.cloudflare.com.
cyberninja-target.com.   300  IN  NS     ns2.cloudflare.com.
cyberninja-target.com.   300  IN  TXT    "v=spf1 include:_spf.google.com ~all"
cyberninja-target.com.   300  IN  TXT    "google-site-verification=abc123"
dev.cyberninja-target.com.  300  IN  A  10.0.1.50
staging.cyberninja-target.com. 300 IN A 10.0.1.51`,
    success: false,
  },
  'curl -I https://cyberninja-target.com': {
    output: `HTTP/2 200
date: Wed, 06 May 2026 12:00:00 GMT
content-type: text/html; charset=UTF-8
server: cloudflare
x-powered-by: Express
x-frame-options: SAMEORIGIN
strict-transport-security: max-age=31536000; includeSubDomains
content-security-policy: default-src 'self'
cf-ray: 8a1b2c3d4e5f6789-SFO`,
    success: false,
  },
  'nikto -h http://192.168.1.10': {
    output: `- Nikto v2.5.0
---------------------------------------------------------------------------
+ Target IP:          192.168.1.10
+ Target Hostname:    192.168.1.10
+ Target Port:        80
+ Start Time:         2026-05-06 12:00:00
---------------------------------------------------------------------------
+ Server: Apache/2.4.49 (Ubuntu)
+ /: The X-Content-Type-Options header is not set.
+ /icons/README: Apache default file found.
+ /server-status: Server status page found (publicly accessible).
+ Apache/2.4.49 is vulnerable to CVE-2021-41773 (Path Traversal)
+ /cgi-bin/: CGI directory found.
+ /phpmyadmin/: phpMyAdmin installation found.
+ /robots.txt: 3 entries found. See entry details.
+ 7 items checked: 5 findings.
---------------------------------------------------------------------------
+ End Time: 2026-05-06 12:01:30
+ 1 host(s) tested`,
    success: false,
  },
  'gobuster dir -u http://192.168.1.10 -w common.txt': {
    output: `===============================================================
Gobuster v3.6 - Directory/File Brute Force
===============================================================
[+] URL:            http://192.168.1.10
[+] Wordlist:       common.txt
[+] Status codes:   200,204,301,302,307,401,403
===============================================================
/admin                (Status: 301) [Size: 312]
/api                  (Status: 200) [Size: 45]
/backup               (Status: 403) [Size: 278]
/cgi-bin              (Status: 403) [Size: 278]
/config               (Status: 403) [Size: 278]
/css                  (Status: 301) [Size: 310]
/images               (Status: 301) [Size: 313]
/js                   (Status: 301) [Size: 309]
/login                (Status: 200) [Size: 2341]
/phpmyadmin           (Status: 200) [Size: 8923]
/robots.txt           (Status: 200) [Size: 156]
/server-status        (Status: 200) [Size: 4521]
/uploads              (Status: 301) [Size: 314]
===============================================================
Finished: 4614 requests in 8.234 seconds`,
    success: false,
  },
  'cat /etc/passwd': {
    output: `root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
sshd:x:110:65534::/run/sshd:/usr/sbin/nologin
operator:x:1000:1000:CyberNinja Operator:/home/operator:/bin/bash
mysql:x:111:115:MySQL Server,,,:/nonexistent:/bin/false`,
    success: false,
  },
  'netstat -tulpn': {
    output: `Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address     Foreign Address   State       PID/Program
tcp        0      0 0.0.0.0:22        0.0.0.0:*         LISTEN      312/sshd
tcp        0      0 0.0.0.0:80        0.0.0.0:*         LISTEN      450/apache2
tcp        0      0 0.0.0.0:443       0.0.0.0:*         LISTEN      450/apache2
tcp        0      0 127.0.0.1:3306    0.0.0.0:*         LISTEN      520/mysqld
tcp        0      0 0.0.0.0:8080      0.0.0.0:*         LISTEN      555/squid
udp        0      0 0.0.0.0:53        0.0.0.0:*                     389/named`,
    success: false,
  },
  'ss -tulpn': {
    output: `Netid  State   Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process
tcp    LISTEN  0       128     0.0.0.0:22      0.0.0.0:*          users:(("sshd",pid=312))
tcp    LISTEN  0       511     0.0.0.0:80      0.0.0.0:*          users:(("apache2",pid=450))
tcp    LISTEN  0       511     0.0.0.0:443     0.0.0.0:*          users:(("apache2",pid=450))
tcp    LISTEN  0       80      127.0.0.1:3306  0.0.0.0:*          users:(("mysqld",pid=520))`,
    success: false,
  },
  'arp -a': {
    output: `? (192.168.1.1) at aa:bb:cc:dd:ee:01 [ether] on eth0
? (192.168.1.10) at aa:bb:cc:dd:ee:10 [ether] on eth0
? (192.168.1.50) at aa:bb:cc:dd:ee:50 [ether] on eth0
? (192.168.1.100) at aa:bb:cc:dd:ee:64 [ether] on eth0`,
    success: false,
  },
  'cat /etc/shadow': {
    output: `cat: /etc/shadow: Permission denied`,
    success: false,
  },
  'sudo cat /etc/shadow': {
    output: `[sudo] password for operator: 
Sorry, user operator is not in the sudoers file. This incident will be reported.`,
    success: false,
  },
  'find / -perm -4000 -type f 2>/dev/null': {
    output: `/usr/bin/passwd
/usr/bin/sudo
/usr/bin/pkexec
/usr/bin/mount
/usr/bin/umount
/usr/bin/chfn
/usr/bin/newgrp
/usr/local/bin/backup_tool`,
    success: false,
  },
  'ps aux': {
    output: `USER       PID %CPU %MEM COMMAND
root         1  0.0  0.1 /sbin/init
root       312  0.0  0.2 /usr/sbin/sshd -D
www-data   450  0.1  0.5 /usr/sbin/apache2 -k start
mysql      520  0.3  2.1 /usr/sbin/mysqld
root       555  0.0  0.3 /usr/sbin/squid
operator  1001  0.0  0.1 -bash
operator  1050  0.0  0.1 ps aux`,
    success: false,
  },
  'ls -la /tmp': {
    output: `total 32
drwxrwxrwt  6 root   root   4096 May  6 12:00 .
drwxr-xr-x 23 root   root   4096 May  1 00:00 ..
drwxr-xr-x  2 root   root   4096 May  5 08:00 .ICE-unix
drwxr-xr-x  2 root   root   4096 May  5 08:00 .X11-unix
-rw-r--r--  1 operator operator   42 May  6 11:00 notes.txt
-rwxr-xr-x  1 www-data www-data 8192 May  6 03:00 cleanup.sh`,
    success: false,
  },
  'cat /tmp/notes.txt': {
    output: `Remember: Always check for SUID binaries first.
The backup_tool in /usr/local/bin looks interesting...`,
    success: false,
  },
  'strings /usr/local/bin/backup_tool': {
    output: `/lib64/ld-linux-x86-64.so.2
libc.so.6
fopen
fread
fwrite
fclose
printf
Usage: backup_tool <file_path>
Backing up file: %s
tar -czf /tmp/backup.tar.gz %s
Backup complete!
Error: Could not open file
GLIBC_2.2.5`,
    success: false,
  },
  'hashcat --help': {
    output: `hashcat (v6.2.6) - advanced password recovery

Usage: hashcat [options] hash|hashfile [dictionary|mask]

Hash modes:
  0     MD5
  100   SHA1
  1400  SHA-256
  1800  sha512crypt
  3200  bcrypt

Attack modes:
  0     Dictionary attack
  1     Combination attack
  3     Brute-force/Mask attack
  6     Hybrid Wordlist + Mask

Example:
  hashcat -m 0 -a 0 hash.txt wordlist.txt`,
    success: false,
  },
  'john --help': {
    output: `John the Ripper 1.9.0-jumbo-1
Usage: john [OPTIONS] [PASSWORD-FILES]

Options:
  --single              "single crack" mode
  --wordlist=FILE       wordlist mode, read words from FILE
  --rules               enable word mangling rules
  --format=NAME         force hash type
  --show                show cracked passwords

Supported formats: md5crypt, sha256crypt, sha512crypt, bcrypt, 
  Raw-MD5, Raw-SHA1, Raw-SHA256, NT, and 300+ more`,
    success: false,
  },
  'echo -n "password" | md5sum': {
    output: `5f4dcc3b5aa765d61d8327deb882cf99  -`,
    success: false,
  },
  'echo -n "password" | sha256sum': {
    output: `5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8  -`,
    success: false,
  },
  'echo "SGVsbG8gV29ybGQ=" | base64 --decode': {
    output: `Hello World`,
    success: false,
  },
  'echo -n "CyberNinja" | base64': {
    output: `Q3liZXJOaW5qYQ==`,
    success: false,
  },
  'echo -n "CyberNinja" | xxd': {
    output: `00000000: 4379 6265 724e 696e 6a61            CyberNinja`,
    success: false,
  },
  'ping 192.168.1.1': {
    output: `PING 192.168.1.1 (192.168.1.1) 56(84) bytes of data.
64 bytes from 192.168.1.1: icmp_seq=1 ttl=64 time=0.543 ms
64 bytes from 192.168.1.1: icmp_seq=2 ttl=64 time=0.412 ms
64 bytes from 192.168.1.1: icmp_seq=3 ttl=64 time=0.387 ms
--- 192.168.1.1 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss
rtt min/avg/max = 0.387/0.447/0.543 ms`,
    success: false,
  },
  'traceroute 8.8.8.8': {
    output: `traceroute to 8.8.8.8 (8.8.8.8), 30 hops max, 60 byte packets
 1  gateway (192.168.1.1)  0.543 ms  0.412 ms  0.387 ms
 2  isp-router (10.0.0.1)  2.134 ms  1.987 ms  2.001 ms
 3  core1.isp.net (72.14.215.85)  5.432 ms  5.123 ms  5.234 ms
 4  dns.google (8.8.8.8)  8.234 ms  7.987 ms  8.123 ms`,
    success: false,
  },
};

export default function SandboxPage() {
  const [activeView, setActiveView] = useState<'split' | 'editor' | 'terminal'>('split');
  const [selectedTemplate, setSelectedTemplate] = useState(SANDBOX_TEMPLATES[0]);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleTemplateSelect = useCallback((template: typeof SANDBOX_TEMPLATES[0]) => {
    setSelectedTemplate(template);
    setShowTemplates(false);
  }, []);

  return (
    <div className="min-h-screen pb-20 lg:pb-0 flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/30 px-4 py-3 lg:px-6 lg:py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="size-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-mono text-cyan-400 tracking-wider">SANDBOX MODE</span>
            </div>
            <h1 className="text-lg lg:text-xl font-extrabold text-foreground">Cyber Playground</h1>
            <p className="text-[10px] text-muted-foreground">Free-form coding and terminal — no mission constraints</p>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="hidden lg:flex items-center gap-1 rounded-lg border border-border bg-secondary/30 p-0.5">
              {[
                { id: 'split' as const, icon: Cpu, label: 'Split' },
                { id: 'editor' as const, icon: Code2, label: 'Editor' },
                { id: 'terminal' as const, icon: Terminal, label: 'Terminal' },
              ].map((view) => (
                <button
                  key={view.id}
                  onClick={() => setActiveView(view.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors',
                    activeView === view.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <view.icon className="size-3" />
                  {view.label}
                </button>
              ))}
            </div>

            {/* Template selector */}
            <div className="relative">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary/30 text-xs font-mono text-foreground hover:bg-secondary/50 transition-colors"
              >
                <span>{selectedTemplate.icon}</span>
                <span className="hidden sm:inline">{selectedTemplate.name}</span>
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>

              {showTemplates && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowTemplates(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                    <div className="px-3 py-2 border-b border-border bg-secondary/20">
                      <p className="text-[10px] font-mono text-muted-foreground tracking-wider">SCRIPT TEMPLATES</p>
                    </div>
                    <div className="py-1 max-h-80 overflow-y-auto">
                      {SANDBOX_TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleTemplateSelect(t)}
                          className={cn(
                            'w-full text-left px-3 py-2.5 hover:bg-secondary/30 transition-colors',
                            selectedTemplate.id === t.id && 'bg-primary/[0.06]'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{t.icon}</span>
                            <div>
                              <p className="text-xs font-bold text-foreground">{t.name}</p>
                              <p className="text-[10px] text-muted-foreground line-clamp-1">{t.description}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Code Editor Panel */}
        {(activeView === 'split' || activeView === 'editor') && (
          <div className={cn('flex-1 p-3 lg:p-4', activeView === 'split' && 'lg:border-r border-border')}>
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{selectedTemplate.icon}</span>
                <h3 className="text-sm font-bold text-foreground">{selectedTemplate.name}</h3>
              </div>
              <p className="text-[10px] text-muted-foreground">{selectedTemplate.description}</p>
            </div>
            <CodeEditor
              language={selectedTemplate.language}
              starterCode={selectedTemplate.code}
              testCases={selectedTemplate.testCases.length > 0 ? selectedTemplate.testCases : undefined}
              challengeDescription={selectedTemplate.description}
              onSubmit={() => {}}
              sandbox
            />
          </div>
        )}

        {/* Terminal Panel */}
        {(activeView === 'split' || activeView === 'terminal') && (
          <div className="flex-1 p-3 lg:p-4">
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="size-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-foreground">Cyber Terminal</h3>
              </div>
              <p className="text-[10px] text-muted-foreground">Practice with 50+ built-in commands: nmap, whois, dig, nikto, gobuster, hashcat, john, and more</p>
            </div>
            <CyberTerminal
              environment="operator@cyberNinja-lab"
              objective="Free exploration mode — run any command to practice your skills"
              commands={SANDBOX_TERMINAL_COMMANDS}
              flag=""
              hint="Try: nmap 192.168.1.0/24 | whois cyberNinja-target.com | dig cyberNinja-target.com any | nikto -h http://192.168.1.10"
              onFlagCaptured={() => {}}
            />
          </div>
        )}
      </div>

      {/* Mobile view toggle */}
      <div className="lg:hidden fixed bottom-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 rounded-full border border-border bg-card/95 backdrop-blur-sm p-1 shadow-xl">
        {[
          { id: 'editor' as const, icon: Code2, label: 'Code' },
          { id: 'split' as const, icon: Cpu, label: 'Both' },
          { id: 'terminal' as const, icon: Terminal, label: 'Terminal' },
        ].map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={cn(
              'flex items-center gap-1 px-3 py-2 rounded-full text-xs font-mono transition-colors',
              activeView === view.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
            )}
          >
            <view.icon className="size-3" />
            {view.label}
          </button>
        ))}
      </div>
    </div>
  );
}

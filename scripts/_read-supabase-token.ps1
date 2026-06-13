# Lit le token Supabase CLI depuis le Credential Manager Windows.
param([switch]$Debug)

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class CredMan {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct CREDENTIAL {
    public int Flags;
    public int Type;
    public string TargetName;
    public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public int CredentialBlobSize;
    public IntPtr CredentialBlob;
    public int Persist;
    public int AttributeCount;
    public IntPtr Attributes;
    public string TargetAlias;
    public string UserName;
  }
  [DllImport("advapi32", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credential);
  [DllImport("advapi32", SetLastError = true)]
  public static extern bool CredFree(IntPtr cred);
}
"@

$targets = @("Supabase CLI:supabase", "LegacyGeneric:target=Supabase CLI:supabase")
foreach ($target in $targets) {
  $ptr = [IntPtr]::Zero
  if (-not [CredMan]::CredRead($target, 1, 0, [ref]$ptr)) {
    if ($Debug) { Write-Host "FAIL $target" }
    continue
  }

  $cred = [Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [Type][CredMan+CREDENTIAL])
  if ($Debug) {
    Write-Host "OK target=$target size=$($cred.CredentialBlobSize) user=$($cred.UserName)"
  }

  if ($cred.CredentialBlobSize -le 0) {
    [CredMan]::CredFree($ptr) | Out-Null
    continue
  }

  $bytes = New-Object byte[] $cred.CredentialBlobSize
  [Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)

  $token = [Text.Encoding]::UTF8.GetString($bytes).Trim([char]0)
  if ($token -notmatch '^sbp_') {
    $token = [Text.Encoding]::Unicode.GetString($bytes).Trim([char]0)
  }

  [CredMan]::CredFree($ptr) | Out-Null

  if ($token -match '^sbp_') {
    Write-Output $token
    exit 0
  }
}

Write-Error "Token Supabase introuvable ou invalide"
exit 1

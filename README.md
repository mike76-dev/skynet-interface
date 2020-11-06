# skynet-interface
This repository includes a few JavaScript files that can help building browser apps that interact with Skynet.

# Contents
<table>
	<tr>
		<td><b>skynet.js</b></td>
		<td>I had trouble making my apps work when run locally, so I implemented my own Skynet functions. It is also possible to use Skynet SDK, of course.</td>
	</tr>
	<tr>
		<td><b>crypto.js</b></td>
		<td>Various cryptographic functions including generating a passphrase from username/password pair.</td>
	</tr>
	<tr>
		<td><b>words.js</b></td>
		<td>A list of English words (2048) used for generating passphrases is stored on Skynet. This module is used for interacting with this list.</td>
	</tr>
	<tr>
		<td><b>index.js</b></td>
		<td>Entry points for the functions to be called from within a html file.</td>
	</tr>
	<tr>
		<td><b>main.js</b></td>
		<td>Javascript file precompiled with <code>npx webpack</code>. It can be referenced within a html file.</td>
	</tr>
</table>

# Some notes on security
A passphrase is generated from username/password combination according to the following steps:
<ol>
	<li>The username + password combination is padded with zeroes to a 32-character string. The zeroes are placed <em>between</em> the username and the password to act as a separator. This limits the total length of username + password currently by 31 character.</li>
	<li>The padded string is encrypted with a 256-byte AES key in CBC mode. This serves two purposes:
		<ul>
			<li>as we are going to have a number of zeroes in the string as well as potentially repeating alphabetic characters, we do not want our passphrase to contain always the same words</li>
			<li>if we change just one bit in the combination, we want to have a major impact on most of the bits in the outcome</li>
		</ul>
	</li>
	<li>The encrypted string is converted from <code>Uint8Array</code> to 11-bit integer array with values ranging from 0 to 2047.</li>
	<li>The resulting array is used as a word index for building the passphrase.</li>
</ol>
<p>The recovery of the username and the password is done in the reversed sequence.</p>
<p>The way of identifying yourself using username/password combination is intended for those to prefer a traditional way over using long seeds. If a username/password combination is chosen properly, it should provide a similar level of security.</p>
<p>It is important to note that, while the username is intended to be public, neither the password nor the passphrase are meant to be leaving your PC. The generated passphrase should be used to generate a public/private key pair with <code>keyPairFromSeed()</code> function.</p>
<p>The 31 character limit of username + password combination can be extended if needed. As AES works with 16-byte blocks, the length of a padded input string needs to be a multiple of 16 (this includes at least one zero separator). Here are the length of passphrases that can be generated from inputs with different lengths:</p>
<table>
	<tr>
		<th>Username + Password</th>
		<th>Passphrase</th>
	</tr>
	<tr>
		<td>15 characters</td>
		<td>12 words</td>
	</tr>
	<tr>
		<td>31 character</td>
		<td>24 words</td>
	</tr>
	<tr>
		<td>47 characters</td>
		<td>35 words</td>
	</tr>
	<tr>
		<td>63 characters</td>
		<td>47 words</td>
	</tr>
</table>
<p>The AES key and CBC-mode initialization vector are currently hardcoded. It is possible, however, to produce the key and/or the IV another way, e.g. derive them from <code>appId</code>.</p>
<p>Needless to say that, like in normal username/password selection, a user needs to choose a strong password. However, it is currently possible that the same username can be chosen by different users (as long as their passwords are different). This could be prevented, for example, by keeping a registry of all occupied usernames.</p>
<p>The username and the password are easily recoverable from the passphrase if they are forgotten.</p>

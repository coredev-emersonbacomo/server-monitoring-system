//go:build windows

package main

import "testing"

func TestWinIfaceType(t *testing.T) {
	cases := []struct {
		name          string
		mt, pmt, desc string
		want          string
	}{
		{"wifi native media type", "Native 802.11", "Native 802.11", "MediaTek Wi-Fi 6 MT7921 Wireless LAN Card", "wifi"},
		{"plain wifi media type", "802.11", "Native 802.11", "Intel Dual Band Wireless-AC", "wifi"},
		{"ethernet", "802.3", "802.3", "Realtek Gaming 2.5GbE", "ethernet"},
		{"wireguard tunnel claims 802.3", "802.3", "Unspecified", "WireGuard Tunnel", "vpn"},
		{"tap adapter", "", "", "TAP-Windows Adapter V9", "vpn"},
		{"bluetooth pan falls to ethernet like linux arphrd", "802.3", "BlueTooth", "Bluetooth Device (Personal Area Network)", "ethernet"},
		{"unknown", "", "", "", "unknown"},
	}
	for _, c := range cases {
		if got := winIfaceType(c.mt, c.pmt, c.desc); got != c.want {
			t.Errorf("%s: winIfaceType(%q,%q,%q) = %q, want %q", c.name, c.mt, c.pmt, c.desc, got, c.want)
		}
	}
}

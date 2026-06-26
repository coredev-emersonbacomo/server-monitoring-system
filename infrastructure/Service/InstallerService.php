<?php

namespace Infrastructure\Service;

use phpseclib3\Net\SSH2;

class InstallerService
{
    public function __construct(
        private string $sshHost,
        private int    $sshPort,
        private string $sshUser,
        private string $sshPassword,
        private string $serverId,
        private string $apiToken,
    ) {}

    public function install(): array
    {
        $ssh = new SSH2($this->sshHost, $this->sshPort);

        if (!$ssh->login($this->sshUser, $this->sshPassword)) {
            throw new \RuntimeException('SSH login failed.');
        }

        $log = [];

        $log['wget'] = $ssh->exec(
            // TODO: to be changed on production
            sprintf(
                'wget -q -O /tmp/install.sh %s',
                escapeshellarg(url("/agents/php_agent/install.sh"))
            )
        );

        if ($ssh->getExitStatus() !== 0) {
            $ssh->disconnect();
            throw new \RuntimeException('wget failed: ' . $log['wget']);
        }

        $ssh->exec('chmod +x /tmp/install.sh');

        $log['install'] = $ssh->exec(
            sprintf(
                'echo "%s" | sudo -S bash /tmp/install.sh %s %s',
                escapeshellarg($this->sshPassword),
                escapeshellarg($this->serverId),
                escapeshellarg($this->apiToken)
            )
        );

        if ($ssh->getExitStatus() !== 0) {
            $ssh->disconnect();
            throw new \RuntimeException('install.sh failed: ' . $log['install']);
        }

        $ssh->exec('rm -f /tmp/install.sh');
        $ssh->disconnect();

        return $log;
    }

    public function uninstall(): array
    {
        $ssh = new SSH2($this->sshHost, $this->sshPort);

        if (!$ssh->login($this->sshUser, $this->sshPassword)) {
            throw new \RuntimeException('SSH login failed.');
        }

        $log = [];

        $log['wget'] = $ssh->exec(
            // TODO: to be changed on production
            sprintf(
                'wget -q -O /tmp/uninstall.sh %s',
                escapeshellarg(url("/agents/php_agent/uninstall.sh"))
            )
        );

        if ($ssh->getExitStatus() !== 0) {
            $ssh->disconnect();
            throw new \RuntimeException('wget failed: ' . $log['wget']);
        }

        $ssh->exec('chmod +x /tmp/uninstall.sh');

        $log['uninstall'] = $ssh->exec(
            sprintf('echo "%s" | sudo -S bash /tmp/uninstall.sh',
                $this->sshPassword
            )
        );

        if ($ssh->getExitStatus() !== 0) {
            $ssh->disconnect();
            throw new \RuntimeException('uninstall.sh failed: ' . $log['uninstall']);
        }

        $ssh->exec('rm -f /tmp/uninstall.sh');
        $ssh->disconnect();

        return $log;
    }
}

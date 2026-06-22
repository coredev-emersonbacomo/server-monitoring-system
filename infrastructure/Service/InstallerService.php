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
            sprintf('wget -q -O /tmp/install.sh %s',
            escapeshellarg(url("/agents/php_agent/install.sh"))
        ));

        if ($ssh->getExitStatus() !== 0) {
            $ssh->disconnect();
            throw new \RuntimeException('wget failed: ' . $log['wget']);
        }

        $ssh->exec('chmod +x /tmp/install.sh');

        $log['install'] = $ssh->exec(
            sprintf(
                'bash /tmp/install.sh %s %s',
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
}

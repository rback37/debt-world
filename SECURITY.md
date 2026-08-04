# Security policy · 安全报告规则

Debt World handles sensitive financial records and anonymous community content. Please report security and privacy problems privately.

上岸星球涉及敏感财务记录和匿名社区内容。安全与隐私问题请使用私密渠道报告。

## Private reporting

Use GitHub's private vulnerability reporting page:

**https://github.com/rback37/debt-world/security/advisories/new**

Please include only what is necessary:

- affected page or endpoint;
- a short description of the impact;
- minimal reproduction steps using synthetic data;
- browser and device family when relevant; and
- a safe contact path through GitHub.

请只提交定位问题所需的最少信息：受影响页面、影响说明、使用虚构数据的复现步骤，以及必要的浏览器或设备类型。

## Never include

- passwords, API keys, recovery information, cookies, or authentication tokens;
- real names, emails, phone numbers, addresses, identity documents, or creditor account numbers;
- exact personal debt, income, payment, or bank records;
- private Kian conversations or raw production responses; or
- information belonging to another user.

If you have already exposed a secret, revoke or rotate it before reporting. Do not test against other users, attempt persistence, download production data, or disrupt the public service.

如果密钥已经暴露，请先撤销或轮换。不要对其他用户测试、维持访问、下载生产数据或影响线上服务。

## Public issues

Use public Issues only for bugs that can be reproduced with synthetic data and contain no exploitable detail. Maintainers may move or remove unsafe public reports.

There is currently no paid bug-bounty program. We will acknowledge good-faith reports and coordinate a responsible fix and disclosure where appropriate.

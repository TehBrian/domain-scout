#!/usr/bin/env node

const nodefetch = require("node-fetch");
const chalk = require("chalk");

const dnsPromises = require("dns").promises;
const fs = require("fs").promises;

const availablePrefix: string =
    chalk.gray("[") + chalk.green("+") + chalk.gray("] ");
const unavailablePrefix: string =
    chalk.gray("[") + chalk.red("-") + chalk.gray("] ");
const unknownPrefix: string =
    chalk.gray("[") + chalk.yellow("?") + chalk.gray("] ");

const tldUrl: string = "https://data.iana.org/TLD/tlds-alpha-by-domain.txt";

async function fetchText(url: string): Promise<string> {
    return nodefetch(url)
        .then((res: any) => res.text());
}

async function isDomainAvailable(domain: Domain): Promise<boolean> {
    try {
        await dnsPromises.lookup(domain.full());
        return false;
    } catch (_) {
        return true;
    }
}

class Domain {
    sld: string;
    tld: string;

    constructor(sld: string, tld: string) {
        this.sld = sld.trim().toLowerCase();
        this.tld = tld.trim().toLowerCase();
    }

    full(): string {
        return (this.sld.toLowerCase() + "." + this.tld.toLowerCase()).trim();
    }
}

function validateTld(tld: string, maxLength: number): boolean {
    // Check if the string is empty.
    if (!tld) return false;
    if (tld.trim().length > maxLength) return false;
    if (tld.includes("-")) return false;
    return true;
}

function newLineAppendToFile(fileName: string, text: string) {
    fs.writeFile(fileName, text + "\n", { flag: "a" });
}

const program = require("commander");

program.version("1.0.0");

program
    .command("print <sld>")
    .description("print SLD combinations with all TLDs")
    .option("-t, --test", "check whether the domain is available")
    .option("-i, --ignore-unavailable", "print only available domains")
    .option("-m, --max <chars>", "use only TLDs with no more than <max> chars")
    .option("-l, --list <fileName>", "pull TLDs from a specific file")
    .option("-d, --disable-prefix", "disables that fancy little prefix")
    .action(function (sld: string, options: any) {
        const ignoreUnavailable: boolean = options.ignoreUnavailable;
        const test: boolean = options.test || ignoreUnavailable;
        const max: number = options.max;
        const listFile: string = options.list;
        const disablePrefix: boolean = options.disablePrefix;

        let rawTldsPromise: Promise<string>;

        if (listFile) {
            console.log(
                chalk.magenta(
                    `Getting TLD list from file ${chalk.italic(listFile)}:`
                )
            );

            rawTldsPromise = fs.readFile(listFile, "utf8");
        } else {
            console.log(
                chalk.magenta(
                    `Getting TLD list from url ${chalk.italic(tldUrl)}:`
                )
            );

            rawTldsPromise = fetchText(tldUrl);
        }

        rawTldsPromise.then((rawTlds) => {
            const tlds: Array<string> = rawTlds.split(/[\r\n]+/);

            let header: string | undefined = tlds.shift();
            if (typeof header === "string") {
                console.log(chalk.magenta(header));
            }

            console.log(
                chalk.blue(`Checking all TLDs with SLD ${chalk.bold(sld)}.`)
            );

            setTimeout(() => {
                for (const tld of tlds) {
                    if (!validateTld(tld, max)) continue;

                    let domain: Domain = new Domain(sld, tld);

                    if (test) {
                        isDomainAvailable(domain).then(function (available) {
                            if (available) {
                                console.log(
                                    disablePrefix
                                        ? chalk.green(domain.full())
                                        : availablePrefix +
                                              chalk.green(domain.full())
                                );
                            } else {
                                if (!ignoreUnavailable) {
                                    console.log(
                                        disablePrefix
                                            ? chalk.red(domain.full())
                                            : unavailablePrefix +
                                                  chalk.red(domain.full())
                                    );
                                }
                            }
                        });
                    } else {
                        console.log(
                            disablePrefix
                                ? chalk.yellow(domain.full())
                                : unknownPrefix + chalk.yellow(domain.full())
                        );
                    }
                }
            }, 2000);
        });
    });

program
    .command("file <sld> <fileName>")
    .description("write SLD combinations with all TLDs to a file")
    .option("-i, --ignore-unavailable", "print only available domains")
    .option("-m, --max <chars>", "use only TLDs with no more than <max> chars")
    .option("-l, --list <fileName>", "pull TLDs from a specific file")
    .action(function (sld: string, fileName: string, options: any) {
        const ignoreUnavailable: boolean = options.ignoreUnavailable;
        const max: number = options.max;
        const listFile: string = options.list;

        let rawTldsPromise: Promise<string>;

        if (listFile) {
            console.log(
                chalk.magenta(
                    `Getting TLD list from file ${chalk.italic(listFile)}:`
                )
            );

            rawTldsPromise = fs.readFile(listFile, "utf8");
        } else {
            console.log(
                chalk.magenta(
                    `Getting TLD list from url ${chalk.italic(tldUrl)}:`
                )
            );

            rawTldsPromise = fetchText(tldUrl);
        }

        rawTldsPromise.then((rawTlds) => {
            const tlds: Array<string> = rawTlds.split(/[\r\n]+/);

            let header: string | undefined = tlds.shift();
            if (typeof header === "string") {
                console.log(chalk.magenta(header));
            }

            console.log(
                chalk.blue(`Checking all TLDs with SLD ${chalk.bold(sld)}.`)
            );

            setTimeout(() => {
                for (const tld of tlds) {
                    if (!validateTld(tld, max)) continue;

                    let domain: Domain = new Domain(sld, tld);

                    if (ignoreUnavailable) {
                        isDomainAvailable(domain).then(function (available) {
                            if (available) {
                                newLineAppendToFile(fileName, domain.full());
                            }
                        });
                    } else {
                        newLineAppendToFile(fileName, domain.full());
                    }
                }
            }, 2000);
        });
    });

program.parse(process.argv);

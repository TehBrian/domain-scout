#!/usr/bin/env node

"use strict";

import * as commander from "commander";
import * as chalk from "chalk";
import * as fetch from "node-fetch";

const dnsPromises = require("dns").promises;
const fs = require("fs").promises;

const availablePrefix: string = chalk.gray("[") + chalk.green("+") + chalk.gray("] ")
const unavailablePrefix: string = chalk.gray("[") + chalk.red("-") + chalk.gray("] ")
const unknownPrefix: string = chalk.gray("[") + chalk.yellow("?") + chalk.gray("] ")

const tldUrl: string = "https://data.iana.org/TLD/tlds-alpha-by-domain.txt";

async function fetchText(url: string): Promise<string> {
    let response: Response = await fetch(url);
    let data: string = await response.text();
    return data;
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

    constructor(sld, tld) {
        this.sld = sld;
        this.tld = tld;
    }

    full(): string {
        return this.sld.toLowerCase() + "." + this.tld.toLowerCase();
    }
}

function validateTld(tld: string): boolean {
    // Check if the string is empty.
    if (!tld) return false;
    if (tld.includes("-")) return false;
    return true;
}

const program = require("commander");

program.version("1.0.0");

program
    .command("print <sld>")
    .description("print SLD combinations with all TLDs")
    .option("-t, --test", "check whether the domain is available")
    .option("-i, --ignore-unavailable", "print only available domains")
    .option("-m, --max <chars>", "use only TLDs with no more than <max> chars")
    .action(function (sld: string, options) {
        const ignoreUnavailable: boolean = options.ignoreUnavailable;
        const test: boolean = options.test || ignoreUnavailable;
        const max: number = options.max;

        console.log(chalk.blue(`Checking all TLDs with SLD ${chalk.bold(sld)}.`));
        console.log(chalk.magenta(`Using TLD list from ${tldUrl}:`))

        setTimeout(() => {
            let tlds: Array<string>;
            fetchText(tldUrl).then((text) => {
                tlds = text.split(/[\r\n]+/);

                let header: string = tlds.shift();
                console.log(chalk.magenta(header));

                for (const tld of tlds) {
                    if (tld.length > max) continue;
                    if (!validateTld(tld)) continue;

                    let domain: Domain = new Domain(sld, tld);

                    if (test) {
                        isDomainAvailable(domain).then(function (available) {
                            if (available) {
                                console.log(availablePrefix + chalk.green(domain.full()));
                            } else {
                                if (!ignoreUnavailable) {
                                    console.log(unavailablePrefix + chalk.red(domain.full()));
                                }
                            }
                        });
                    } else {
                        console.log(unknownPrefix + chalk.yellow(domain.full()));
                    }
                }
            });
        }, 2000);
    });

function newLineAppendToFile(fileName: string, text: string) {
    fs.writeFile(fileName, text + "\n", { flag: "a" });
}

program
    .command("file <sld> <fileName>")
    .description("write SLD combinations with all TLDs to a file")
    .option("-i, --ignore", "print only available domains")
    .option("-m, --max <chars>", "use only TLDs with no more than <max> chars")
    .action(function (sld: string, fileName: string, options) {
        const ignoreUnavailable: boolean = options.ignore;
        const max: number = options.max;

        console.log(chalk.blue(`Checking all TLDs with SLD ${chalk.bold(sld)}.`));
        console.log(chalk.magenta(`Using TLD list from ${tldUrl}:`))
        console.log(ignoreUnavailable)
        console.log(max)

        setTimeout(() => {
            let tlds: Array<string>;
            fetchText(tldUrl).then((text) => {
                tlds = text.split(/[\r\n]+/);

                let header: string = tlds.shift();
                console.log(chalk.magenta(header));

                for (const tld of tlds) {
                    if (tld.length > max) continue;
                    if (!validateTld(tld)) continue;

                    let domain: Domain = new Domain(sld, tld);

                    if (ignoreUnavailable) {
                        isDomainAvailable(domain).then(function (available) {
                            if (available) {
                                newLineAppendToFile(fileName, domain.full())
                            }
                        });
                    } else {
                        newLineAppendToFile(fileName, domain.full())
                    }
                }
            });
        }, 2000);
    });

program.parse(process.argv);

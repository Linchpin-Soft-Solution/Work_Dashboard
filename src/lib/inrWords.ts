export function numberToInrWords(num: number): string {
  if (num === 0) return "Zero";

  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const inWords = (n: number) => {
    let str = "";
    if (n > 99) {
      str += a[Math.floor(n / 100)] + "Hundred ";
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += a[n];
    }
    return str;
  };

  const numStr = num.toFixed(2);
  const parts = numStr.split(".");
  let rupees = parseInt(parts[0], 10);
  let paise = parseInt(parts[1], 10);

  let wordStr = "";
  if (rupees > 9999999) {
    wordStr += inWords(Math.floor(rupees / 10000000)) + "Crore ";
    rupees %= 10000000;
  }
  if (rupees > 99999) {
    wordStr += inWords(Math.floor(rupees / 100000)) + "Lakh ";
    rupees %= 100000;
  }
  if (rupees > 999) {
    wordStr += inWords(Math.floor(rupees / 1000)) + "Thousand ";
    rupees %= 1000;
  }
  if (rupees > 0) {
    wordStr += inWords(rupees);
  }

  let finalStr = "Rupees " + wordStr.trim();

  if (paise > 0) {
    finalStr += " and " + inWords(paise).trim() + " Paise";
  }

  return finalStr + " Only";
}

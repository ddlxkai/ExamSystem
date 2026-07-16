import Foundation
import PDFKit

guard CommandLine.arguments.count == 2 else {
    FileHandle.standardError.write(Data("Usage: pdfkit_extract <pdf-path>\n".utf8))
    exit(64)
}

let pdfPath = CommandLine.arguments[1]
let pdfURL = URL(fileURLWithPath: pdfPath)

guard let document = PDFDocument(url: pdfURL) else {
    FileHandle.standardError.write(Data("无法打开 PDF：\(pdfPath)\n".utf8))
    exit(1)
}

var pageTexts: [String] = []
pageTexts.reserveCapacity(document.pageCount)

for index in 0..<document.pageCount {
    let title = "===== 第 \(index + 1) 页 ====="
    let pageText = document.page(at: index)?.string?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    pageTexts.append("\(title)\n\n\(pageText)")
}

let fullText = pageTexts.joined(separator: "\n\n")
FileHandle.standardOutput.write(Data(fullText.utf8))

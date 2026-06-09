<?php

class ImportController {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function processRequest($method) {
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(['message' => 'Method not allowed']);
            return;
        }

        if (!isset($_FILES['file'])) {
            http_response_code(400);
            echo json_encode(['message' => 'No file uploaded']);
            return;
        }

        $file = $_FILES['file'];
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $content = file_get_contents($file['tmp_name']);

        try {
            $this->pdo->beginTransaction();

            if ($ext === 'json') {
                $this->importJson($content);
            } elseif ($ext === 'csv') {
                $this->importCsv($file['tmp_name']);
            } elseif ($ext === 'xml') {
                $this->importXml($content);
            } else {
                throw new Exception('Unsupported file format');
            }

            $this->pdo->commit();
            echo json_encode(['message' => 'Import successful']);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(400);
            echo json_encode(['message' => 'Import failed: ' . $e->getMessage()]);
        }
    }

    private function importJson($content) {
        $data = json_decode($content, true);
        if (!$data) throw new Exception('Invalid JSON format');
        foreach ($data as $row) {
            $this->insertItem($row);
        }
    }

    private function importCsv($filePath) {
        $handle = fopen($filePath, 'r');
        $header = fgetcsv($handle);
        if (!$header) throw new Exception('Invalid CSV format');
        
        while (($data = fgetcsv($handle)) !== FALSE) {
            $row = array_combine($header, $data);
            $this->insertItem($row);
        }
        fclose($handle);
    }

    private function importXml($content) {
        $xml = simplexml_load_string($content);
        if (!$xml) throw new Exception('Invalid XML format');
        foreach ($xml->item as $item) {
            $row = json_decode(json_encode($item), true);
            $this->insertItem($row);
        }
    }

    private function insertItem($row) {
        if (!isset($row['name']) || !isset($row['category_id'])) {
            throw new Exception('Missing required fields in row');
        }
        
        $stmt = $this->pdo->prepare('INSERT INTO items (category_id, name, quantity, min_threshold) VALUES (?, ?, ?, ?)');
        $qty = isset($row['quantity']) ? (int)$row['quantity'] : 0;
        $min = isset($row['min_threshold']) ? (int)$row['min_threshold'] : 5;
        $stmt->execute([$row['category_id'], $row['name'], $qty, $min]);
    }
}

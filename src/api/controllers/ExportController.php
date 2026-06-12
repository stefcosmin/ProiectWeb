<?php

class ExportController {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function processRequest($method, $format) {
        if ($method !== 'GET') {
            http_response_code(405);
            echo json_encode(['message' => 'Method not allowed']);
            return;
        }

        $stmt = $this->pdo->query('
            SELECT i.id, i.name, i.quantity, i.min_threshold, i.last_checked, i.category_id, c.name as category_name 
            FROM items i 
            LEFT JOIN categories c ON i.category_id = c.id
        ');
        $items = $stmt->fetchAll();

        switch ($format) {
            case 'json':
                $this->exportJson($items);
                break;
            case 'csv':
                $this->exportCsv($items);
                break;
            case 'xml':
                $this->exportXml($items);
                break;
            case 'html':
                $this->exportHtml($items);
                break;
            default:
                http_response_code(400);
                echo json_encode(['message' => 'Invalid format requested. Valid formats: json, csv, xml, html']);
                break;
        }
    }

    private function exportJson($data) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data);
    }

    private function exportCsv($data) {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=export.csv');
        $output = fopen('php://output', 'w');
        if (count($data) > 0) {
            fputcsv($output, array_keys($data[0]));
            foreach ($data as $row) {
                fputcsv($output, $row);
            }
        }
        fclose($output);
    }

    private function exportXml($data) {
        header('Content-Type: application/xml; charset=utf-8');
        header('Content-Disposition: attachment; filename=export.xml');
        $xml = new SimpleXMLElement('<items/>');
        foreach ($data as $row) {
            $item = $xml->addChild('item');
            foreach ($row as $key => $value) {
                $item->addChild($key, htmlspecialchars($value ?? ''));
            }
        }
        echo $xml->asXML();
    }

    private function exportHtml($data) {
        header('Content-Type: text/html; charset=utf-8');
        echo '<!DOCTYPE html><html><head><title>Statistics / Export HTML</title></head><body>';
        echo '<h1>Inventory Statistics</h1>';
        echo '<table border="1"><tr>';
        if (count($data) > 0) {
            foreach (array_keys($data[0]) as $key) {
                echo '<th>' . htmlspecialchars($key) . '</th>';
            }
            echo '</tr>';
            foreach ($data as $row) {
                echo '<tr>';
                foreach ($row as $value) {
                    echo '<td>' . htmlspecialchars($value ?? '') . '</td>';
                }
                echo '</tr>';
            }
        }
        echo '</table>';
        echo '<button onclick="window.print()">Print / Save as PDF</button>'; //simplu hack pentru PDF client-side
        echo '</body></html>';
    }
}

<?php

class ItemController {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function processRequest($method, $id, $action = null) {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $this->getItem($id);
                } else {
                    $this->getAllItems();
                }
                break;
            case 'POST':
                if ($action === 'import') {
                    $this->importItems();
                } else {
                    $this->createItem();
                }
                break;
            case 'PUT':
                if ($id) {
                    $this->updateItem($id);
                }
                break;
            case 'DELETE':
                if ($id) {
                    $this->deleteItem($id);
                }
                break;
            default:
                http_response_code(405);
                echo json_encode(['message' => 'Method not allowed']);
                break;
        }
    }

    private function getAllItems() {
        $stmt = $this->pdo->query('
            SELECT i.id, i.name, i.quantity, i.min_threshold, i.last_checked, c.id as category_id, c.name as category_name 
            FROM items i 
            LEFT JOIN categories c ON i.category_id = c.id
        ');
        $items = $stmt->fetchAll();
        echo json_encode($items);
    }

    private function getItem($id) {
        $stmt = $this->pdo->prepare('
            SELECT i.id, i.name, i.quantity, i.min_threshold, i.last_checked, c.id as category_id, c.name as category_name 
            FROM items i 
            LEFT JOIN categories c ON i.category_id = c.id
            WHERE i.id = ?
        ');
        $stmt->execute([$id]);
        $item = $stmt->fetch();
        if ($item) {
            echo json_encode($item);
        } else {
            http_response_code(404);
            echo json_encode(['message' => 'Item not found']);
        }
    }

    private function createItem() {
        $data = json_decode(file_get_contents('php://input'), true);
        if (isset($data['name'], $data['category_id'], $data['quantity'])) {
            $stmt = $this->pdo->prepare('INSERT INTO items (category_id, name, quantity, min_threshold, last_checked) VALUES (?, ?, ?, ?, ?)');
            $min = isset($data['min_threshold']) ? $data['min_threshold'] : 5;
            $last_checked = isset($data['last_checked']) ? $data['last_checked'] : null;
            $stmt->execute([$data['category_id'], $data['name'], $data['quantity'], $min, $last_checked]);
            http_response_code(201);
            echo json_encode(['id' => $this->pdo->lastInsertId()]);
        } else {
            http_response_code(400);
            echo json_encode(['message' => 'Invalid data']);
        }
    }

    private function updateItem($id) {
        $data = json_decode(file_get_contents('php://input'), true);
        $fields = [];
        $params = [];
        $allowed = ['category_id', 'name', 'quantity', 'min_threshold', 'last_checked'];
        
        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = ?";
                $params[] = $data[$field];
            }
        }
        
        if (count($fields) > 0) {
            $stmtCheck = $this->pdo->prepare('SELECT id FROM items WHERE id = ?');
            $stmtCheck->execute([$id]);
            if (!$stmtCheck->fetch()) {
                http_response_code(404);
                echo json_encode(['message' => 'Item not found']);
                return;
            }

            $params[] = $id;
            $sql = 'UPDATE items SET ' . implode(', ', $fields) . ' WHERE id = ?';
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['message' => 'Item updated']);
        } else {
            http_response_code(400);
            echo json_encode(['message' => 'No valid fields provided']);
        }
    }

    private function deleteItem($id) {
        $stmt = $this->pdo->prepare('DELETE FROM items WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode(['message' => 'Item deleted']);
    }

    private function importItems() {
        http_response_code(501);
        echo json_encode(['message' => 'Not implemented yet']);
    }
}
